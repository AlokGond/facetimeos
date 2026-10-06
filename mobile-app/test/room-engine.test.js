import { NativeModules } from 'react-native';
import { mediaDevices } from 'react-native-webrtc';
import * as Y from 'yjs';
import { RoomEngine } from '../src/RoomEngine';
jest.mock('react-native-webrtc', () => ({
  mediaDevices: { getUserMedia: jest.fn() },
  MediaStream: jest.fn(),
}));
jest.mock('react-native-incall-manager', () => ({
  stop: jest.fn(),
  setKeepScreenOn: jest.fn(),
}));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('../../client/src/lib/webrtc', () => ({
  PeerConnectionManager: jest.fn(),
}));
jest.mock('../../client/src/lib/yjs-transport', () => ({
  encodeUpdate: value => value,
}));

let engine, handlers;
beforeEach(() => {
  NativeModules.FaceTimeMeeting = { stopMeeting: jest.fn() };
  engine = new RoomEngine(
    { roomId: 'test' },
    { displayName: 'Mobile' },
    jest.fn(),
  );
  engine.session = { peerId: 'mobile', displayName: 'Mobile' };
  handlers = {};
  engine.socket = {
    on: (event, fn) => {
      handlers[event] = fn;
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  engine.rtc = {
    handleDescription: jest.fn(),
    handleCandidate: jest.fn(),
    broadcast: jest.fn(),
    destroy: jest.fn(),
    peers: new Map(),
    applyQualityLadder: jest.fn().mockResolvedValue(),
    closePeer: jest.fn(),
  };
  engine.wire();
  engine.joined = true;
  engine.patch({
    role: 'editor',
    connected: true,
    tools: { whiteboard: true },
  });
});
afterEach(() => engine.dispose());

test.each(['offer', 'answer'])(
  'mobile sends %s using the server/web SDP envelope',
  type => {
    const description = { type, sdp: 'v=0\r\n' };
    engine.rtc.onDescription('browser', description);
    expect(engine.socket.emit).toHaveBeenCalledWith(`sdp-${type}`, {
      to: 'browser',
      sdp: description,
    });
  },
);

test.each(['offer', 'answer'])('mobile receives the relayed %s SDP', type => {
  const sdp = { type, sdp: 'v=0\r\n' };
  handlers[`sdp-${type}`]({ from: 'browser', sdp });
  expect(engine.rtc.handleDescription).toHaveBeenCalledWith('browser', sdp);
});

test('ICE candidates use the existing web envelope in both directions', () => {
  const candidate = {
    candidate: 'candidate:test',
    sdpMid: '0',
    sdpMLineIndex: 0,
  };
  engine.rtc.onIceCandidate('browser', candidate);
  expect(engine.socket.emit).toHaveBeenCalledWith('ice-candidate', {
    to: 'browser',
    candidate,
  });
  handlers['ice-candidate']({ from: 'browser', candidate });
  expect(engine.rtc.handleCandidate).toHaveBeenCalledWith('browser', candidate);
});

test('disconnect discards peer connections and stale media before rejoining', () => {
  engine.rtc.peers.set('browser', {});
  engine.patch({
    streams: { browser: {} },
    connections: { browser: 'connected' },
    media: { browser: { video: true } },
  });
  handlers.disconnect();
  expect(engine.rtc.closePeer).toHaveBeenCalledWith('browser');
  expect(engine.state).toMatchObject({
    connected: false,
    streams: {},
    connections: {},
    media: {},
  });
});

test('peer departure removes remote streams and presence', () => {
  engine.patch({
    peers: [{ peerId: 'browser' }],
    streams: { browser: {} },
    media: { browser: { video: true } },
  });
  handlers['peer-left']({ peerId: 'browser' });
  expect(engine.state.streams).toEqual({});
  expect(engine.state.media).toEqual({});
});

test('unmuting reacquires an ended microphone track before publishing', async () => {
  const ended = { readyState: 'ended' };
  const fresh = { enabled: false, stop: jest.fn() };
  engine.stream = {
    getAudioTracks: () => [ended],
    getTracks: () => [],
    removeTrack: jest.fn(),
    addTrack: jest.fn(),
  };
  engine.requestPermission = jest.fn().mockResolvedValue(true);
  NativeModules.FaceTimeMeeting.startMeeting = jest
    .fn()
    .mockResolvedValue(true);
  mediaDevices.getUserMedia.mockResolvedValue({
    getAudioTracks: () => [fresh],
  });
  engine.rtc.replaceAudioTrack = jest.fn().mockResolvedValue(1);
  await engine.setAudio(true);
  expect(engine.stream.removeTrack).toHaveBeenCalledWith(ended);
  expect(engine.rtc.replaceAudioTrack).toHaveBeenCalledWith(fresh);
  expect(fresh.enabled).toBe(true);
  expect(engine.state.audio).toBe(true);
});

test('denied microphone permission leaves audio off', async () => {
  engine.stream = { getAudioTracks: () => [], getTracks: () => [] };
  engine.requestPermission = jest.fn().mockResolvedValue(false);
  await engine.setAudio(true);
  expect(engine.state.audio).toBe(false);
  expect(engine.state.error).toMatch(/Microphone permission/);
});

test('failed camera capture preserves the previous working track', async () => {
  const previous = { stop: jest.fn() };
  engine.stream = {
    getVideoTracks: () => [previous],
    getTracks: () => [],
    removeTrack: jest.fn(),
  };
  engine.requestPermission = jest.fn().mockResolvedValue(false);
  engine.patch({ video: true });
  await expect(engine.setVideo(true)).rejects.toThrow('Camera permission');
  expect(previous.stop).not.toHaveBeenCalled();
  expect(engine.stream.removeTrack).not.toHaveBeenCalled();
  expect(engine.state.video).toBe(true);
});

test('editing is blocked until cloud snapshot loads and while reconnecting', () => {
  expect(engine.canEdit()).toBe(false);
  handlers['doc-snapshot']({ updates: [] });
  expect(engine.canEdit()).toBe(true);
  expect(engine.canEdit('whiteboard')).toBe(true);
  expect(engine.canEdit('code')).toBeFalsy();
  handlers.disconnect();
  expect(engine.canEdit()).toBe(false);
});
test('malformed persisted data fails closed instead of overwriting cloud work', () => {
  handlers['doc-snapshot']({ updates: ['invalid'] });
  expect(engine.canEdit()).toBe(false);
  engine.sendChat('not allowed');
  expect(engine.doc.getArray('chat').length).toBe(0);
});
test('timeline/chat match web schema, incoming data is not echoed back', () => {
  handlers['doc-snapshot']({ updates: [] });
  engine.log('decision', 'Ship a beta');
  engine.sendChat(' hello web ');
  expect(engine.doc.getArray('timeline').get(0)).toMatchObject({
    by: 'mobile',
    byName: 'Mobile',
    kind: 'decision',
  });
  expect(engine.doc.getArray('chat').get(0)).toMatchObject({
    from: 'mobile',
    name: 'Mobile',
    text: 'hello web',
  });
  const remote = new Y.Doc();
  remote.getText('notes').insert(0, 'from browser');
  engine.socket.emit.mockClear();
  handlers['doc-update']({ update: Y.encodeStateAsUpdate(remote) });
  expect(engine.doc.getText('notes').toString()).toBe('from browser');
  expect(engine.socket.emit).not.toHaveBeenCalled();
  remote.destroy();
});
test('viewers cannot publish edits or use granted tools', () => {
  handlers['doc-snapshot']({ updates: [] });
  engine.patch({ role: 'viewer' });
  expect(engine.canEdit('whiteboard')).toBe(false);
  engine.sendChat('blocked');
  engine.log('decision', 'blocked');
  expect(engine.doc.getArray('chat').length).toBe(0);
  expect(engine.doc.getArray('timeline').length).toBe(0);
});
test('participants joining during screen share receive screen track', () => {
  const track = { id: 'screen' },
    replaceTrack = jest.fn().mockResolvedValue();
  engine.screenStream = { getVideoTracks: () => [track], getTracks: () => [] };
  engine.rtc.ensurePeer = jest.fn(id => {
    const peer = { senders: new Map([['video', { replaceTrack }]]) };
    engine.rtc.peers.set(id, peer);
    return peer;
  });
  engine.updatePeers([{ peerId: 'browser', role: 'editor' }]);
  expect(replaceTrack).toHaveBeenCalledWith(track);
});
