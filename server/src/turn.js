import crypto from 'node:crypto';
import { TURN, STUN_URLS } from './config.js';

/**
 * Ephemeral TURN credentials, per the coturn REST API convention
 * (`static-auth-secret` / "TURN REST API" draft):
 *
 *   username   = "<unix-expiry>:<opaque-id>"
 *   credential = base64( HMAC-SHA1( shared_secret, username ) )
 *
 * This is how you ship a relay to a browser without ever shipping a long-lived
 * password. A leaked credential expires on its own.
 */
function ephemeralCredentials(identity) {
  const expiry = Math.floor(Date.now() / 1000) + TURN.ttlSeconds;
  const username = `${expiry}:${identity}`;
  const credential = crypto.createHmac('sha1', TURN.secret).update(username).digest('base64');
  return { username, credential, expiresAt: expiry * 1000 };
}

/**
 * Build the ICE server list handed to the browser.
 *
 * STUN alone only works when at least one side can be reached directly. Behind
 * symmetric NAT, CGNAT, or a firewall that blocks UDP — common on mobile
 * carriers and corporate networks — the connection never establishes. A TURN
 * relay is the only fix, so this is the difference between "works on my laptop"
 * and "works for everyone".
 */
export function buildIceConfig(identity = 'anon') {
  const iceServers = STUN_URLS.map((urls) => ({ urls }));
  let ttlSeconds = TURN.ttlSeconds;
  let hasTurn = false;

  if (TURN.urls.length > 0) {
    if (TURN.secret) {
      const { username, credential } = ephemeralCredentials(identity);
      iceServers.push({ urls: TURN.urls, username, credential });
      hasTurn = true;
    } else if (TURN.staticUsername && TURN.staticPassword) {
      iceServers.push({
        urls: TURN.urls,
        username: TURN.staticUsername,
        credential: TURN.staticPassword,
      });
      hasTurn = true;
    } else {
      console.warn('[turn] TURN_URLS is set but neither TURN_SECRET nor TURN_USERNAME/PASSWORD is — skipping TURN.');
    }
  }

  if (!hasTurn) ttlSeconds = 300;

  return {
    iceServers,
    hasTurn,
    // The browser re-fetches shortly before credentials lapse.
    ttlSeconds,
    // `relay` forces every candidate through TURN; useful for a "hide my IP"
    // privacy toggle, but only offer it when a relay actually exists.
    iceTransportPolicyOptions: hasTurn ? ['all', 'relay'] : ['all'],
  };
}

export function turnConfigured() {
  return TURN.urls.length > 0 && Boolean(TURN.secret || (TURN.staticUsername && TURN.staticPassword));
}
