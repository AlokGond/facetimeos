'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * The control bar.
 *
 * Additions over the previous version: screen sharing (the single most-requested
 * thing this app could not do at all), a presenter-follow toggle, and an export
 * button — plus every action that used to be a forgeable data-channel message is
 * now just a callback the page routes through the server.
 *
 * The entrance animation is a CSS keyframe (`.ftos-rise` in globals.css) rather
 * than a `mounted` flag flipped from an effect: a state write in an effect just
 * to play an animation is a cascading render for something CSS does for free.
 */

const REACTIONS = ['👏', '❤️', '😂', '🎉', '👍', '🔥'];

export default function CallControls({
  isMuted = false,
  isCameraOff = false,
  isScreenSharing = false,
  canShareScreen = true,
  canEdit = true,
  isHost = false,
  isHandRaised = false,
  followingPresenter = false,
  unreadChatCount = 0,
  participantCount = 1,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onOpenWidget,
  /**
   * `(type) => boolean` — whether this participant may open that widget. The
   * whiteboard and the code editor belong to the host, so a guest sees them
   * marked with a padlock; the click still goes through, because it is what
   * sends the request.
   */
  canUseWidget,
  onToggleParticipants,
  onToggleChat,
  onToggleTimeline,
  onToggleFollow,
  onToggleRaiseHand,
  onSendReaction,
  onShareLink,
  onExport,
  onEndCall,
  onEndForAll,
}) {
  const [menu, setMenu] = useState(null); // 'reactions' | 'widgets' | null
  const barRef = useRef(null);

  /* Click-away, so an open tray does not swallow the next click on the video. */
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (event) => {
      if (!barRef.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menu]);

  /**
   * Every colour here is a pair. The old bar was written dark-first —
   * `text-white/80`, `text-indigo-200`, `text-red-400` — so on the light theme
   * the icons were pale grey on near-white and the toggled states were
   * indistinguishable from the untoggled ones.
   */
  /* 40px on a phone, 44px from `sm` up. Ten of these at 44 plus gaps and two
     dividers is ~520px, which does not fit a 375px screen at any gap; shrinking
     the buttons alone is not enough either, which is why the bar wraps. 40 is
     still a comfortable touch target. */
  const btn =
    'relative flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition-colors duration-150 text-[var(--on-surface)] hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:hover:bg-transparent sm:h-11 sm:w-11';
  const plain = `${btn} border-transparent`;
  const danger =
    'border-red-600/40 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300';
  const active =
    'border-indigo-600/40 bg-indigo-100 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/25 dark:text-indigo-100';
  /* Shared by both pop-up trays: opaque, because they open over live video. The
     max-width matters once the bar wraps on a phone — a tray centred on a button
     near the screen edge would otherwise run off it. */
  const tray =
    'ftos-panel absolute bottom-14 left-1/2 z-50 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-2xl border shadow-2xl';

  const widgets = [
    { type: 'CODE_EDITOR', icon: '⌨️', label: 'Code editor' },
    { type: 'WHITEBOARD', icon: '🎨', label: 'Whiteboard' },
    { type: 'NOTES', icon: '📝', label: 'Live notes' },
    { type: 'WEB_BROWSER', icon: '🌐', label: 'Shared browser' },
    { type: 'MEETING_TIMER', icon: '⏱️', label: 'Meeting timer' },
  ];

  return (
    <div
      ref={barRef}
      className="ftos-rise fixed bottom-3 left-1/2 z-50 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 overflow-visible rounded-2xl px-3 py-2.5 sm:bottom-5 sm:gap-2 sm:px-4 sm:py-3"
      style={{
        // `--surface-overlay`, not `--bg-nav`: the bar sits on top of somebody's
        // face, and the nav token is tuned for a solid page behind it.
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--surface-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      }}
    >
      <button
        type="button"
        onClick={onToggleMic}
        className={`${btn} ${isMuted ? danger : 'border-transparent'}`}
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        aria-pressed={isMuted}
      >
        {isMuted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.36 2.18"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        )}
      </button>

      <button
        type="button"
        onClick={onToggleCamera}
        className={`${btn} ${isCameraOff ? danger : 'border-transparent'}`}
        title={isCameraOff ? 'Start video (V)' : 'Stop video (V)'}
        aria-pressed={isCameraOff}
      >
        {isCameraOff ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        )}
      </button>

      {onToggleScreenShare && (
        <button
          type="button"
          onClick={onToggleScreenShare}
          disabled={!canShareScreen}
          className={`${btn} ${isScreenSharing ? active : 'border-transparent'}`}
          title={
            canShareScreen
              ? isScreenSharing
                ? 'Stop sharing your screen'
                : 'Share your screen'
              : 'Screen sharing is not available in this browser'
          }
          aria-pressed={isScreenSharing}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </button>
      )}

      <div
        className="mx-1 hidden h-7 w-px sm:block"
        style={{ background: 'var(--surface-border)' }}
      />

      {/* One tray for all five widgets. Five separate buttons pushed the bar wider
          than a laptop screen once screen share and export were added. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenu((prev) => (prev === 'widgets' ? null : 'widgets'))}
          disabled={!canEdit}
          className={`${btn} ${menu === 'widgets' ? active : 'border-transparent'}`}
          title={canEdit ? 'Open a shared tool' : 'You have view-only access'}
          aria-expanded={menu === 'widgets'}
        >
          <span className="text-base">🧩</span>
        </button>

        {menu === 'widgets' && (
          <div className={`${tray} w-52 p-1.5`}>
            {widgets.map((widget) => {
              const locked = canUseWidget ? !canUseWidget(widget.type) : false;
              return (
                <button
                  key={widget.type}
                  type="button"
                  onClick={() => {
                    onOpenWidget?.(widget.type);
                    setMenu(null);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--bg-muted)]"
                  title={locked ? `Ask the host for ${widget.label.toLowerCase()} access` : undefined}
                >
                  <span className="text-base">{widget.icon}</span>
                  <span className="flex-1">{widget.label}</span>
                  {locked && <span className="text-[10px] opacity-70">🔒</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {onToggleRaiseHand && (
        <button
          type="button"
          onClick={onToggleRaiseHand}
          className={`${btn} ${
            isHandRaised
              ? 'border-amber-600/40 bg-amber-100 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/25 dark:text-amber-200'
              : 'border-transparent'
          }`}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          aria-pressed={isHandRaised}
        >
          <span className="text-base">🖐️</span>
        </button>
      )}

      {onSendReaction && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((prev) => (prev === 'reactions' ? null : 'reactions'))}
            className={`${btn} ${menu === 'reactions' ? active : 'border-transparent'}`}
            title="Reactions"
            aria-expanded={menu === 'reactions'}
          >
            <span className="text-base">😃</span>
          </button>

          {menu === 'reactions' && (
            <div className={`${tray} flex flex-wrap items-center justify-center gap-1 p-2`}>
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSendReaction(emoji);
                    setMenu(null);
                  }}
                  className="rounded-xl p-2 text-lg transition-transform hover:scale-125 hover:bg-[var(--bg-muted)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {onToggleChat && (
        <button type="button" onClick={onToggleChat} className={plain} title="Room chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {unreadChatCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-primary,#3b82f6)] px-1 text-[9px] font-bold text-white">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>
      )}

      <button type="button" onClick={onToggleParticipants} className={plain} title="Participants">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--surface-raised)] px-1 text-[9px] font-bold text-[var(--on-surface)] ring-1 ring-[var(--surface-border)]">
          {participantCount}
        </span>
      </button>

      {onToggleTimeline && (
        <button type="button" onClick={onToggleTimeline} className={plain} title="Session timeline">
          <span className="text-base">🕘</span>
        </button>
      )}

      {onToggleFollow && (
        <button
          type="button"
          onClick={onToggleFollow}
          className={`${btn} ${followingPresenter ? active : 'border-transparent'}`}
          title={
            followingPresenter
              ? 'Stop following the presenter’s layout'
              : 'Follow the presenter’s layout'
          }
          aria-pressed={followingPresenter}
        >
          <span className="text-base">🎯</span>
        </button>
      )}

      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className={plain}
          title="Export everything this meeting produced"
        >
          <span className="text-base">📦</span>
        </button>
      )}

      {onShareLink && (
        <button type="button" onClick={onShareLink} className={plain} title="Copy the invite link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      )}

      <div
        className="mx-1 hidden h-7 w-px sm:block"
        style={{ background: 'var(--surface-border)' }}
      />

      <button
        type="button"
        onClick={onEndCall}
        className={`${btn} border-red-600/50 bg-red-500/90 text-white hover:bg-red-500`}
        title="Leave the call"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z"/></svg>
      </button>

      {isHost && onEndForAll && (
        <button
          type="button"
          onClick={onEndForAll}
          className="rounded-xl border border-red-700/50 bg-red-600/90 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          title="End the meeting for everyone"
        >
          End all
        </button>
      )}
    </div>
  );
}
