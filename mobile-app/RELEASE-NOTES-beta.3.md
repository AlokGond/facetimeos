# FaceTimeOS Android 1.0.0-beta.3

## Fixes

- Fixed the Android signaling payload mismatch that prevented meeting audio/video from connecting to web, Windows and other Android participants. Offers and answers now send and receive the server's existing `sdp` envelope instead of incompatible `offer` / `answer` fields.
- Rebuild peer connections after a signaling disconnect so rejoining does not retain failed connections and stale media.
- Remove departed participants' streams and media state.
- Reacquire an ended microphone track when the user chooses to unmute.
- Preserve the previous camera track if a new permission/capture attempt fails.
- Show connecting, reconnecting and failed media status on participant tiles.
- Add Android lint and regression/interoperability tests to GitHub CI.

## Checks performed

- 26 Android tests passed, including a real local Socket.IO server relaying offers, answers and ICE in both directions through the actual Android event wiring. Native media is mocked in this test; it proves protocol compatibility, not real audio/video playback.
- 75 backend, 63 web client and 25 desktop tests passed.
- Android lint: no errors; existing inline-style and test-fixture warnings remain.
- Hosted backend health check succeeded and `/rtc/ice` reported TURN availability. This is a configuration check, not proof of successful relay allocation on every network.
- Release APK build succeeded; APK v2 signature verified against the existing release certificate (SHA-256 `BD:44:25:97:CA:19:EA:A4:6C:3C:03:E2:32:61:49:28:41:B7:81:EE:CB:FF:50:FB:3A:FD:82:F0:08:7B:F8:B4`).

## Install and verify

Download `FaceTimeOS-1.0.0-beta.3-android.apk` and install it over the previous APK. It uses the same application ID and release signing key; do not uninstall first. No Firebase rules, fingerprints or backend configuration changes are needed for this update.

After installation, leave old test meetings and start a fresh meeting. Join the same invitation from the web/Windows app and Android, then repeat with Android creating the meeting. Verify both cameras, speech in both directions, mute/unmute, camera off/on, speaker/headset, screen sharing and reconnect after a network change. Use headphones or separate the devices to avoid acoustic feedback. Set call/media volume while the meeting is active.

This remains a beta. Physical iQOO 15R / Android 16 voice, camera, Bluetooth and network-switch testing was not available for this release and must be completed on the user's phone. No claim is made that every device-specific issue has been eliminated.
