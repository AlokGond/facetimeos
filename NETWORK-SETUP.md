# Testing FaceTimeOS across devices (phone, second laptop)

## Two separate reasons the page looks broken over the network

There are **two** independent issues when you leave `localhost`. Both are now
fixed in the repo, but it helps to know which is which:

### 1. Blank page → Next.js blocked its own JavaScript

Next.js 16 refuses to serve its dev resources (`/_next/hmr`,
`/_next/static/chunks/*`) to any origin other than `localhost` unless you
whitelist it. When it's blocked, **no JavaScript loads and the page is
completely blank** (this is what you were seeing on both the LAN IP and the
tunnel). You'll see this in the client terminal:

```
⚠ Blocked cross-origin request to Next.js dev resource /_next/... from "192.168.204.1".
  ... add it to "allowedDevOrigins" in next.config.js and restart the dev server
```

**Fixed** in `client/next.config.mjs` via `allowedDevOrigins`, which whitelists
the LAN IP and `*.trycloudflare.com` (plus ngrok/localtunnel). After changing
that file you **must restart `npm run dev`** — it's only read at startup.

### 2. No camera/mic → insecure context

Even once the page loads, opening the app at `http://192.168.x.x:3000` gives you
**no camera or mic**. That is **not** a Firebase problem — it's a browser
security rule:

- `http://localhost` is treated as a **secure context**.
- `http://192.168.x.x` (any plain-HTTP LAN IP) is treated as **insecure**.

In an insecure context the browser removes `navigator.mediaDevices` (camera +
mic) and restricts other startup APIs, so a WebRTC app can't run. Adding the IP
to Firebase Authorized Domains only fixes Google's sign-in domain check; it does
not make the origin secure.

The fix is to serve the app over **HTTPS**. The easiest way to get HTTPS that
works on phones (no certificate warnings) is a tunnel.

---

## Recommended: one HTTPS tunnel with cloudflared

The app now proxies signaling (`/socket.io`) through the Next server, so a
**single tunnel** exposes both the UI and the signaling server. No second
tunnel, no CORS setup, no editing config files.

### 1. Install cloudflared (one time)

Windows (PowerShell):

```powershell
winget install --id Cloudflare.cloudflared
```

(or download `cloudflared.exe` from Cloudflare and put it on your PATH)

### 2. Start the app (two terminals)

```bash
# Terminal 1 — signaling server (port 3001)
cd server
npm run dev
```

```bash
# Terminal 2 — web app (port 3000)
cd client
npm run dev
```

### 3. Start the tunnel (third terminal)

```bash
cloudflared tunnel --url http://localhost:3000
```

It prints a public URL like:

```
https://random-words-here.trycloudflare.com
```

### 4. Open that HTTPS URL on any device

Open the `https://….trycloudflare.com` link on your phone and/or another
laptop. Camera and mic now work, and refreshing keeps you as a single
participant. Create a room on one device, copy the room link, open it on the
other.

> **Sign-in note:** random `trycloudflare.com` subdomains change each run and
> Firebase can't wildcard them, so **Google sign-in popups will fail** on a
> tunnel. Use **email/password** sign-in for tunnel demos (it doesn't require an
> authorized domain). If you need Google sign-in, use a stable named tunnel or a
> real domain and add it under Firebase → Authentication → Settings → Authorized
> domains.

---

## Notes

- **Transport:** through a tunnel, socket.io signaling may run over HTTP
  long-polling instead of a raw WebSocket. That is fine — signaling is
  low-volume, and the actual audio/video/data flows peer-to-peer over WebRTC,
  not through the tunnel.
- **ngrok** works too: `ngrok http 3000` (needs a free account). Same idea.
- **Same machine only?** You don't need any of this — just use
  `http://localhost:3000`. Camera works because localhost is a secure context.

---

## Both devices connected but can't see each other ("1 participant" on each)

If the app loads on both devices, both show "Connected", but each shows only
**1 participant** and no remote video, the socket.io **signaling** connection
isn't completing through the tunnel.

Why: the single-tunnel setup proxies `/socket.io` through Next.js `rewrites()`.
Next.js rewrites forward plain HTTP but **do not proxy WebSocket upgrades**, so
socket.io's attempt to upgrade from long-polling to a WebSocket fails and can
drop the connection before either peer finishes joining the room.

Fix (already in the repo): the client pins socket.io to **polling only** when it
detects it's talking to its own origin (i.e. going through the rewrite) — see
`client/src/lib/signaling.js`. Polling is forwarded reliably by the rewrite, and
signaling is low-volume so there's no downside; the actual audio/video still
flows peer-to-peer over WebRTC.

To confirm it's working, open the browser console on each device. You should see
`[Signaling] connected to https://…trycloudflare.com via polling`. If instead
you see `[Signaling] connect_error …`, the polling proxy itself is failing — use
the **two-tunnel** setup below, which connects the client straight to the
signaling server (no rewrite in the way) and is guaranteed to work.

---

## Advanced: two tunnels (native WebSocket)

Only needed if you specifically want a raw WebSocket for signaling.

1. Tunnel the signaling server:
   `cloudflared tunnel --url http://localhost:3001` → copy its `https://…` URL.
2. Create `client/.env.local`:
   ```
   NEXT_PUBLIC_SIGNALING_URL=https://your-server-tunnel.trycloudflare.com
   ```
3. Restart `npm run dev` in `client` (env vars are read at startup).
4. Tunnel the client too: `cloudflared tunnel --url http://localhost:3000`, and
   open that URL on your devices.

The server already accepts any origin in dev. To lock it down in production,
set `CLIENT_ORIGIN` on the server to a comma-separated list of allowed origins.
