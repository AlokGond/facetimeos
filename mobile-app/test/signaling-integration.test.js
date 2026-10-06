/** @jest-environment node */
// Actual mobile event wiring against the actual server, with only native media
// mocked. This verifies interoperability, not physical camera/audio quality.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RoomEngine } from '../src/RoomEngine';
const { io } = jest.requireActual('socket.io-client');

jest.mock('react-native', () => ({
  NativeModules: { FaceTimeMeeting: { stopMeeting: jest.fn() } },
  AppState: {},
  PermissionsAndroid: {},
  Platform: { OS: 'android' },
}));
jest.mock('react-native-webrtc', () => ({
  mediaDevices: {},
  MediaStream: jest.fn(),
}));
jest.mock('react-native-incall-manager', () => ({
  stop: jest.fn(),
  setKeepScreenOn: jest.fn(),
}));
jest.mock('../../client/src/lib/webrtc', () => ({
  PeerConnectionManager: jest.fn(),
}));
jest.mock('../../client/src/lib/yjs-transport', () => ({
  encodeUpdate: value => value,
}));

let child, base;
const engines = [],
  sockets = [];
const waitFor = async predicate => {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error('Timed out waiting for signaling');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};
const request = async (route, body) => {
  const response = await fetch(`${base}/rtc${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Local test API returned ${response.status}`);
  return response.json();
};
const connect = async () => {
  const socket = io(base, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  const connected = new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  socket.connect();
  await connected;
  return socket;
};

beforeAll(async () => {
  // Empty temporary cwd avoids loading the developer's .env or cloud secrets.
  const os = require('node:os');
  const serverUrl = pathToFileURL(
    path.resolve(__dirname, '../../server/src/index.js'),
  ).href;
  const launcher = `const { httpServer } = await import(${JSON.stringify(
    serverUrl,
  )});
    const ready = () => console.log('TEST_PORT=' + httpServer.address().port);
    if (httpServer.listening) ready(); else httpServer.once('listening', ready);`;
  child = spawn(process.execPath, ['--input-type=module', '-e', launcher], {
    cwd: os.tmpdir(),
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      PORT: '0',
      NODE_ENV: 'test',
      JWT_SECRET: 'mobile-signaling-test-secret-not-for-production',
      CLIENT_ORIGIN: '',
      DOC_STORE_ENABLED: 'false',
      DOC_STORE_PROVIDER: 'local',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(
      () => reject(new Error('Test server did not start')),
      10000,
    );
    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Test server exited: ${code}`));
    });
    child.stderr.on('data', () => {});
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/TEST_PORT=(\d+)/);
      if (match) {
        clearTimeout(timeout);
        base = `http://127.0.0.1:${match[1]}`;
        resolve();
      }
    });
  });
}, 15000);

afterAll(async () => {
  engines.forEach(engine => engine.dispose());
  sockets.forEach(socket => socket.disconnect());
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
});

test('mobile and browser exchange offer/answer and ICE in both initiation directions', async () => {
  const room = await request('/rooms', {
    title: 'Isolated interoperability test',
  });
  const webSession = await request(`/rooms/${room.roomId}/session`, {
    inviteToken: room.hostToken,
    displayName: 'Web test',
  });
  const mobileSession = await request(`/rooms/${room.roomId}/session`, {
    inviteToken: room.inviteTokens.editor,
    displayName: 'Android test',
  });
  const web = await connect();
  expect(
    (
      await web
        .timeout(5000)
        .emitWithAck('join-room', { sessionToken: webSession.sessionToken })
    ).ok,
  ).toBe(true);
  const mobile = new RoomEngine(
    { roomId: room.roomId },
    { displayName: 'Android test' },
    () => {},
  );
  engines.push(mobile);
  mobile.session = mobileSession;
  mobile.socket = io(base, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(mobile.socket);
  mobile.rtc = {
    peers: new Map(),
    ensurePeer: jest.fn(),
    closePeer: jest.fn(),
    destroy: jest.fn(),
    broadcast: jest.fn(),
    applyQualityLadder: jest.fn().mockResolvedValue(),
    handleDescription: jest.fn(),
    handleCandidate: jest.fn(),
  };
  mobile.wire();
  mobile.socket.connect();
  await waitFor(() => mobile.state.connected);
  for (const type of ['offer', 'answer']) {
    const sdp = { type, sdp: `v=0\r\ns=interop-${type}\r\n` };
    const received = new Promise(resolve => web.once(`sdp-${type}`, resolve));
    mobile.rtc.onDescription(webSession.peerId, sdp);
    expect(await received).toEqual({ from: mobileSession.peerId, sdp });
    web.emit(`sdp-${type}`, { to: mobileSession.peerId, sdp });
    await waitFor(() =>
      mobile.rtc.handleDescription.mock.calls.some(
        ([, value]) => value?.type === type,
      ),
    );
    expect(mobile.rtc.handleDescription).toHaveBeenCalledWith(
      webSession.peerId,
      sdp,
    );
  }
  const candidate = {
    candidate: 'candidate:test',
    sdpMid: '0',
    sdpMLineIndex: 0,
  };
  const ice = new Promise(resolve => web.once('ice-candidate', resolve));
  mobile.rtc.onIceCandidate(webSession.peerId, candidate);
  expect(await ice).toEqual({ from: mobileSession.peerId, candidate });
  web.emit('ice-candidate', { to: mobileSession.peerId, candidate });
  await waitFor(() => mobile.rtc.handleCandidate.mock.calls.length);
  expect(mobile.rtc.handleCandidate).toHaveBeenCalledWith(
    webSession.peerId,
    candidate,
  );
}, 15000);
