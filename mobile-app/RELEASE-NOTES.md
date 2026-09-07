# FaceTimeOS Android 1.0.0-beta.1

Install the APK directly on an ARM64 Android phone (Android 7 or newer). Android 16 is targeted. No local server or computer is needed by recipients. Uses the existing hosted FaceTimeOS backend and Firebase project.

## Included

- Native home, Google/email account flows and pre-join device choices.
- Video/audio calls, camera switching, speaker/headset routing and native screen sharing.
- Named participants, invitations, waiting room and host controls.
- Shared chat, notes, code, whiteboard with undo/redo, timer, browser URLs and session timeline.
- Labeled controls, consistently placed panels with minimize/restore, and ZIP export.
- Release-key signed APK; SHA-256 checksum attached. Web and Windows source logic is unchanged.

## Verification and beta limitations

Passed: Android release compilation, APK signature verification (matching the registered Firebase release fingerprint), 16 KB ZIP alignment, Android 16 x86_64 emulator installation/startup and hosted health response; 12 mobile tests, 63 web-client tests and 75 backend tests. Dependency audit reported no known vulnerabilities at build time. Startup logs showed no ReactNativeJS/AndroidRuntime errors in the checked interval.

**Not yet end-to-end verified on the iQOO 15R:** Google login, real camera/microphone calls, cross-network TURN, Bluetooth, background behavior and screen sharing between actual devices. Treat this as a testing beta, not a production-readiness guarantee.

Screen sharing does not include internal device audio. Camera pauses in the background. Mobile code runs JavaScript/HTML/CSS and validates JSON; other listed languages are edit-only. Whiteboard export is stroke JSON. No iOS, incoming-call push, verified HTTPS App Links or automatic APK installation. Paste web invitations into the app. The free Render service may need a minute to wake up.

## Setup

Keep Google/Email authentication enabled in Firebase. No new permissive Firestore rules are needed. Never upload Firebase Admin credentials or the private Android signing key. See [ANDROID-SETUP.md](https://github.com/AlokGond/facetimeos/blob/main/ANDROID-SETUP.md) for all owner steps and the phone test checklist.

Phone owner must approve installation, camera/mic and screen-capture prompts themselves. Keep Android security protections enabled.
