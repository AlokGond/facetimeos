'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/ui/AuthModal';
import ThemeSwitcher from '../components/ui/ThemeSwitcher';
import { useAuth } from '../context/AuthContext';
import { ApiError, rememberName, rememberedName, roomApi, saveHostToken } from '../lib/room-api';

/**
 * Creating a room used to run `localStorage.setItem('hostToken_' + id,
 * generateUUID())` — a credential the browser invented and the room then trusted,
 * so anyone could be host of any room by writing one key. Rooms are now minted by
 * `POST /rtc/rooms` and the host token is signed by the server, which re-verifies
 * it on every privileged action.
 *
 * Every entry point below is behind sign-in, so `openModal` is the one place that
 * decides between the room modal and the auth modal. `needsAccount` explains the
 * one case where it lets you through anyway.
 */
export default function Home() {
  const router = useRouter();
  const { user, logout, authAvailable } = useAuth();

  const [showModal, setShowModal] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Which modal to open once sign-in succeeds, so "Create Room → sign in" does
  // not dump you back on the landing page having to click Create Room again.
  const [pendingIntent, setPendingIntent] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Creating and joining both require an account.
   *
   * The gate is deliberately skipped when Firebase is not configured: with no
   * auth provider there is no way to sign in, so enforcing it would lock every
   * door in the building and throw away the key. The room shows a banner in that
   * state instead of pretending to be protected.
   *
   * Worth being precise about what this is: a product rule, not a security
   * boundary. Room capabilities are enforced by the signaling server's signed
   * tokens; this check only decides who gets offered the door.
   */
  const needsAccount = authAvailable && !user;

  /**
   * The name is seeded here, in a click handler, rather than by an effect that
   * copies `user.displayName` into state — that effect was a
   * `set-state-in-effect` error, and reading `localStorage` during render would
   * mismatch hydration.
   */
  const openModal = useCallback(
    (which) => {
      if (needsAccount) {
        setPendingIntent(which);
        setShowAuthModal(true);
        return;
      }
      setError(null);
      setShowModal(which);
      setDisplayName((prev) => prev || user?.displayName || rememberedName());
    },
    [needsAccount, user]
  );

  /**
   * Takes the account from the sign-in call rather than from context: `user`
   * arrives one `onAuthStateChanged` tick later, and by then this render has
   * already decided whether to open the room modal.
   */
  const handleAuthenticated = useCallback(
    (account) => {
      setShowAuthModal(false);
      setError(null);
      setDisplayName((prev) => prev || account?.displayName || rememberedName());
      setShowModal(pendingIntent);
      setPendingIntent(null);
    },
    [pendingIntent]
  );

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setPendingIntent(null);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(null);
    setRoomId('');
    setError(null);
  }, []);

  const handleCreateRoom = useCallback(
    async (e) => {
      e.preventDefault();
      const name = displayName.trim();
      if (!name || busy) return;
      setBusy(true);
      setError(null);
      try {
        // Same possessive rule the server applies when somebody reaches a room
        // by link instead of creating it here ("Chris' room", not "Chris's"), so
        // the two routes cannot produce two different names for one room.
        const title = `${name}${/s$/i.test(name) ? "'" : "'s"} room`;
        const room = await roomApi.createRoom(title);
        // The room page reads the host token back out of this key and presents it
        // to the server, which decides whether it really grants host.
        saveHostToken(room.roomId, room.hostToken);
        rememberName(name);
        router.push(`/room/${room.roomId}`);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Could not reach the meeting server.'
        );
        setBusy(false);
      }
    },
    [busy, displayName, router]
  );

  const handleJoinRoom = useCallback(
    (e) => {
      e.preventDefault();
      const name = displayName.trim();
      // People paste the whole invite link far more often than a bare id, so
      // accept both — and keep the `?t=` invite token if it is there.
      const raw = roomId.trim();
      const match = raw.match(/\/room\/([^/?#]+)(\?[^#]*)?/);
      const target = match ? `${match[1]}${match[2] || ''}` : raw;
      if (!name || !target) return;
      rememberName(name);
      router.push(`/room/${target}`);
    },
    [displayName, roomId, router]
  );

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        onSuccess={handleAuthenticated}
        reason={
          pendingIntent === 'create'
            ? 'Sign in to create a room.'
            : pendingIntent === 'join'
              ? 'Sign in to join a room.'
              : undefined
        }
      />

      {/* ─── Navbar ─── */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--accent-primary)' }}
            >
              F
            </div>
            <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              FaceTimeOS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            <button
              onClick={() => openModal('join')}
              className="px-3.5 py-2 rounded-md text-sm transition-colors hidden md:block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Join Room
            </button>

            <button
              onClick={() => openModal('create')}
              className="gradient-btn px-4 py-2 rounded-md text-sm font-medium text-white"
            >
              Create Room
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 ml-1">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium text-white"
                  style={{ background: 'var(--accent-primary)' }}
                  title={user.displayName || user.email}
                >
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-md text-sm transition-colors hidden md:block"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              /* Rendered unconditionally. Wrapping this in `authAvailable` made
                 the feature look deleted on a build with no Firebase keys — the
                 modal explains that situation far better than a missing button
                 does. */
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="flex-grow flex flex-col">
        {/* One container width for every band on this page — the nav, each
            section and the footer previously used max-w-7xl / 5xl / 4xl / 2xl,
            so their left edges stepped in and out as you scrolled. */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-32 pb-16 md:pt-40 md:pb-24 lg:pb-32">
          {/* Two equal columns rather than flex-1 boxes with different max
              widths, which left a dead gap down the middle of the hero. */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Copy */}
            <div className="min-w-0">
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                A call with the tools already inside it
              </p>

              <h1
                className="font-bold tracking-tight leading-[1.08] mb-6"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.08,
                }}
              >
                Stop screen-sharing
                <br />
                <span style={{ color: 'var(--accent-primary)' }}>your editor.</span>
              </h1>

              <p
                className="text-base md:text-lg max-w-lg mb-10 leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sharing a screen is a bad way to write code with someone: one person
                types and everyone else reads out line numbers. Here the editor, the
                whiteboard and the notes are inside the call, so anybody can just put
                their cursor in the file. Close the tab — it is all still there tomorrow.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => openModal('create')}
                  className="gradient-btn px-7 py-3 rounded-lg text-sm font-medium text-white"
                >
                  Create a Room
                </button>
                <button
                  onClick={() => openModal('join')}
                  className="px-7 py-3 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Join a Room
                </button>
              </div>

              <p className="text-xs mt-8 max-w-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {needsAccount
                  ? 'Sign in once so the room knows who is who. After that it is just a browser tab — Chrome, Edge, Brave or Firefox. No install, no extension.'
                  : 'Just a browser tab — Chrome, Edge, Brave or Firefox. No install, no extension.'}
              </p>
            </div>

            {/* Right: Abstract visual — represents the spatial desktop */}
            <div className="w-full min-w-0">
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  /* `--surface-panel`, not `--bg-card`: in dark mode that token is a
                     3% white overlay, so the whole mock had no fill and the fake
                     window edges floated on the page background. */
                  background: 'var(--surface-panel)',
                  borderColor: 'var(--border-subtle)',
                  boxShadow: '0 0 0 1px var(--border-subtle), 0 20px 60px -12px rgba(0,0,0,0.15)',
                }}
              >
                {/* Fake browser chrome */}
                <div
                  className="flex items-center gap-1.5 px-4 py-2.5 border-b"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <div className="flex-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    facetimeos.app/room/abc-123
                  </div>
                </div>

                {/* Spatial desktop mock */}
                <div className="relative p-4" style={{ minHeight: '280px' }}>
                  {/* Video tiles row */}
                  <div className="flex gap-2 mb-3">
                    {[
                      { color: '#6366f1', w: '28%' },
                      { color: '#8b5cf6', w: '28%' },
                      { color: '#ec4899', w: '28%' },
                    ].map((v, i) => (
                      <div
                        key={i}
                        className="rounded-lg flex items-center justify-center"
                        style={{
                          width: v.w,
                          height: '72px',
                          background: `linear-gradient(135deg, ${v.color}22, ${v.color}11)`,
                          border: `1px solid var(--border-subtle)`,
                        }}
                      >
                        <div className="w-6 h-6 rounded-full" style={{ background: v.color + '44' }} />
                      </div>
                    ))}
                  </div>

                  {/* Floating widgets */}
                  <div className="relative" style={{ height: '150px' }}>
                    {/* Code editor window */}
                    <div
                      className="absolute rounded-lg border overflow-hidden"
                      style={{
                        left: '0', top: '0', width: '55%', height: '100%',
                        background: 'rgba(30,30,30,0.8)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>main.js</span>
                      </div>
                      <div className="p-2.5 font-mono" style={{ fontSize: '8px', lineHeight: 1.6 }}>
                        <div><span style={{ color: '#c678dd' }}>const</span> <span style={{ color: '#e5c07b' }}>app</span> <span style={{ color: '#56b6c2' }}>=</span> <span style={{ color: '#e5c07b' }}>express</span>()</div>
                        <div><span style={{ color: '#c678dd' }}>async function</span> <span style={{ color: '#61afef' }}>init</span>() {'{'}</div>
                        <div className="pl-2"><span style={{ color: '#c678dd' }}>await</span> <span style={{ color: '#61afef' }}>connect</span>()</div>
                        <div className="pl-2"><span style={{ color: '#98c379' }}>{'// ← editing live'}</span></div>
                        <div>{'}'}</div>
                      </div>
                    </div>

                    {/* Whiteboard window */}
                    <div
                      className="absolute rounded-lg border overflow-hidden"
                      style={{
                        right: '0', top: '0', width: '42%', height: '55%',
                        background: 'rgba(26,26,46,0.9)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Whiteboard</span>
                      </div>
                      <svg viewBox="0 0 120 50" className="w-full" style={{ height: '70px' }}>
                        <path d="M10,40 Q30,10 50,30 T90,20" fill="none" stroke="#f97066" strokeWidth="1.5" />
                        <circle cx="70" cy="15" r="8" fill="none" stroke="#6366f1" strokeWidth="1" />
                        <rect x="5" y="35" width="25" height="12" rx="2" fill="none" stroke="#a3e635" strokeWidth="1" />
                      </svg>
                    </div>

                    {/* Notes window */}
                    <div
                      className="absolute rounded-lg border overflow-hidden"
                      style={{
                        right: '0', bottom: '0', width: '42%', height: '40%',
                        background: 'var(--surface-raised)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="px-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="text-[9px]" style={{ color: 'var(--on-surface-muted)' }}>Meeting Notes</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="rounded" style={{ height: '3px', width: `${70 - i * 15}%`, background: 'var(--surface-border)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── What is actually in the room ─── */}
        <section className="py-24 md:py-28 px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-14 max-w-xl">
              <h2
                className="font-bold tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                  color: 'var(--text-primary)',
                }}
              >
                Five things you can open mid-sentence
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                They open as windows on a shared canvas, not as tabs somewhere else.
                Drag one where you want it and everyone sees it in the same place.
              </p>
            </div>

            {/* A list, not a card grid. These five entries genuinely differ in
                length and in how much explaining they need; forcing them into
                three equal boxes with three equal-length sentences is exactly
                what made this page read like brochure filler. */}
            <dl className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {[
                [
                  'Code editor',
                  'Monaco — the editor VS Code is built on. Two people can type in the same file and neither one clobbers the other, and the Run button executes JavaScript in a sandboxed iframe. Only JavaScript, so do not go looking for Python.',
                ],
                [
                  'Whiteboard',
                  'Pen, shapes, arrows, text. Enough to sketch a schema on. Exports as an SVG you can paste into a report.',
                ],
                [
                  'Shared notes',
                  'One text file for the call. Somebody always ends up being the note-taker — this way nobody has to be.',
                ],
                [
                  'Timer',
                  'For the fifteen-minute sync that is drifting towards forty. It sits on the wall, so nobody has to be the person who mentions it.',
                ],
                [
                  'A browser panel',
                  'Keep the docs or a dashboard next to the faces instead of alt-tabbing away and losing the thread. Sites that send an X-Frame-Options header cannot be embedded by anything, and it tells you that plainly rather than showing a white rectangle for seven seconds.',
                ],
              ].map(([term, copy]) => (
                <div
                  key={term}
                  className="grid gap-2 border-b py-6 sm:grid-cols-[11rem_1fr] sm:gap-8"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <dt className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {term}
                  </dt>
                  <dd
                    className="m-0 max-w-2xl text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {copy}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section className="py-24 md:py-28 px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
              <div>
                <h2
                  className="font-bold tracking-tight mb-4"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--text-primary)',
                  }}
                >
                  The video never touches a server
                </h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Audio and video go straight from one browser to another. Nothing in
                  the middle decodes it, mixes it or records it, because there is
                  nothing in the middle. On a locked-down office network a TURN relay
                  forwards the packets, and even then they stay encrypted end to end —
                  the relay is a postman, not a reader.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  What the small server does do: introduce people to each other, hold
                  the host&apos;s authority so mute and kick cannot be faked by
                  editing a message, and keep the room&apos;s documents so the tenth
                  person to join does not need the ninth to still be online.
                </p>
              </div>

              {/**
               * This used to be three big accent-coloured zeros — "media servers in
               * the path: 0", "recordings kept: 0", "downloads to install: 0". They
               * were true, but a made-up statistic in a huge typeface is the single
               * most brochure-like thing a page can do. A numbered walk-through of
               * what actually happens is more use to anybody deciding whether to
               * trust this with a meeting.
               */}
              <ol className="m-0 flex list-none flex-col gap-5 p-0">
                {[
                  'You press Create. The server mints the room and signs a host token for your browser. Earlier versions let the browser invent that token itself, which meant anybody could be host of any room by writing one localStorage key.',
                  'You send the link. Whoever opens it gets introduced to everyone already inside, and from that point the media path is browser to browser.',
                  'The editor, the board and the notes are CRDTs. Two edits to the same line merge instead of one winning, so nothing has to be locked and nobody has to ask for the file.',
                  'When you are done, Export writes a ZIP in your browser: the source files, the board as SVG, notes and chat as Markdown. It is not uploaded anywhere to be built.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      className="shrink-0 text-sm font-semibold tabular-nums"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ─── What the other meeting apps don't do ─── */}
        <section className="py-24 md:py-28 px-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-14 max-w-xl">
              <h2
                className="font-bold tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                  color: 'var(--text-primary)',
                }}
              >
                What Zoom and Meet don&apos;t do
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Those two are better than this at being a video call. None of them
                leave anything behind except a recording nobody opens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  /* The one that matters most gets the full width. Six identical
                     boxes implied all six were equally important, which they are
                     not. */
                  wide: true,
                  title: 'The room is still there next week',
                  desc: 'Close the tab and come back on Thursday: the code, the board, the notes and even where you dragged the windows are exactly where you left them. Reloading gets your seat back rather than adding a ghost copy of you to the participant list.',
                },
                {
                  title: 'A timeline, not a transcript',
                  desc: 'Joins, leaves, windows opened, and the decisions somebody bothered to write down — a short log you can read in ten seconds. Written by the people who were in the room instead of guessed at by a model.',
                },
                {
                  title: 'Export is a ZIP, not a support ticket',
                  desc: 'Source files, the whiteboard as SVG, notes and chat as Markdown, the timeline as JSON. It is built in your browser, so nothing gets uploaded to be packaged and there is no retention policy to go and read.',
                },
                {
                  title: "Follow the presenter, until you don't",
                  desc: "The host pins a tile or a window and everyone's view moves with them. The moment you drag something yourself you quietly stop following, instead of fighting the layout for the rest of the call.",
                },
                {
                  title: 'Host powers are signed',
                  desc: 'Mute, kick, lock and role changes are verified server-side against a signed token. A participant cannot forge one by editing a message — which the first version of this app cheerfully allowed, and which is the bug I am least proud of.',
                },
                {
                  title: 'Roles belong to the link',
                  desc: 'An invite link carries a role. A viewer can watch and cannot rewrite your file; an editor can. You mint the link for the role, so it does not matter who ends up holding it.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`step-card rounded-xl p-6 ${item.wide ? 'md:col-span-2' : ''}`}
                >
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/**
         * ─── Where it falls over ───
         *
         * A limits section is the least AI-sounding thing a landing page can have,
         * and every one of these is a question the two of us would otherwise be
         * answering by email. Being first to say "about six people" is cheaper than
         * somebody discovering it during a class demo.
         */}
        <section className="py-24 md:py-28 px-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-16">
              <div>
                <h2
                  className="font-bold tracking-tight mb-3"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Where it falls over
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  You would find these out in the first ten minutes anyway.
                </p>
              </div>

              <ul className="m-0 flex list-none flex-col gap-5 p-0">
                {[
                  ['About six people.', 'Everybody sends their camera to everybody else, so the upload cost grows with the square of the room. Quality steps down as people arrive, but past six or so a home connection runs out before the app does.'],
                  ['One webcam, one browser.', 'Two browsers on the same machine cannot both open the same camera. The second one joins with audio only and tells you why. That is the operating system, not this.'],
                  /* LIMITS-TAIL */
                  ['Strict networks need a relay.', 'Without TURN credentials on the server a few office and campus networks will connect audio and never video. The room says so when it has actually happened to you, rather than warning you up front about a problem you probably do not have.'],
                  ['Run only runs JavaScript.', 'In a sandboxed iframe, in your own tab. There is no backend runtime behind it, so no Python, no npm packages, no file system.'],
                  ['Nothing is recorded.', 'On purpose, and also structurally: there is no media server to record from, and adding one would mean putting a decoder in the middle of every call.'],
                ].map(([lede, rest]) => (
                  <li key={lede} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{lede}</strong>{' '}
                    {rest}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 md:py-28 px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <h2
                className="font-bold tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                  color: 'var(--text-primary)',
                }}
              >
                Try it with one other person
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Make a room, paste the link to somebody, and open the code editor
                while you talk. That is the whole thing — five minutes will tell you
                whether it is useful to you.
              </p>
              <button
                onClick={() => openModal('create')}
                className="gradient-btn px-8 py-3 rounded-lg text-sm font-medium text-white"
              >
                Create a Room
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="mx-auto w-full max-w-6xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent-primary)' }}>F</div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>FaceTimeOS</span>
          </div>
          <p className="text-xs max-w-md leading-relaxed md:text-right" style={{ color: 'var(--text-muted)' }}>
            A final-year B.Tech CSE project at BBSBEC, Fatehgarh Sahib. WebRTC carries
            the call; Yjs holds everything that has to outlive it. Still being worked
            on, so if something looks half-finished it probably is.
          </p>
        </div>
      </footer>

      {/* ─── Room Modal ─── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md relative animate-scale-in rounded-xl p-8"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-lg font-semibold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
              {showModal === 'create' ? 'Create a room' : 'Join a room'}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {showModal === 'create'
                ? 'You will be the host. Share the link afterwards and anyone who opens it lands in the same room.'
                : 'Paste the link you were sent, or just the room id from the end of it.'}
            </p>

            <form onSubmit={showModal === 'create' ? handleCreateRoom : handleJoinRoom} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                <input
                  type="text" required autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[var(--accent-primary)]"
                  /* `ringColor` is not a CSS property, so the focus ring rendered
                     with Tailwind's default colour. It is a utility now. */
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
                  placeholder="Your name"
                />
              </div>

              {showModal === 'join' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Room link or ID</label>
                  <input
                    type="text" required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
                    placeholder="https://…/room/abc-123  or  abc-123"
                  />
                </div>
              )}

              {error && (
                /* Was accent text on a 12%-accent wash: about 2:1 against the panel
                   in either theme, so the one message you need to read was the
                   faintest thing in the modal. */
                <p className="ftos-notice-warn text-xs rounded-lg px-3 py-2" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="gradient-btn w-full py-2.5 rounded-lg font-medium text-sm text-white mt-1 disabled:opacity-60"
              >
                {showModal === 'create' ? (busy ? 'Creating…' : 'Create Room') : 'Join Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}