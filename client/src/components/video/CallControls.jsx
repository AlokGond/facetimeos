'use client';

import React, { useEffect, useRef, useState } from 'react';

const REACTIONS = ['👏', '❤️', '😂', '🎉', '👍', '🔥'];

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></>,
    micOff: <><path d="m3 3 18 18M9 9v3a3 3 0 0 0 5.1 2.1M15 10V5a3 3 0 0 0-5.7-1.3M17.4 17.4A7 7 0 0 1 5 12v-2M19 10v2c0 .7-.1 1.4-.3 2M12 19v3M8 22h8"/></>,
    camera: <><path d="m16 10 5-3v10l-5-3"/><rect x="3" y="5" width="13" height="14" rx="2"/></>,
    cameraOff: <><path d="m3 3 18 18M10.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1M16 8l5-3v10l-3-1.8"/></>,
    screen: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    tools: <><path d="M14.7 6.3a4 4 0 0 0-5-5L7.5 3.5l3 3 2.2-2.2a4 4 0 0 0 2 2ZM9.3 17.7a4 4 0 0 0 5 5l2.2-2.2-3-3-2.2 2.2a4 4 0 0 0-2-2Z"/><path d="m8 8 8 8"/></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
    board: <><path d="M4 3h16v12H4zM8 21l4-6 4 6M8 8h8M8 11h5"/></>,
    notes: <><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4"/></>,
    browser: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M17 11h6"/></>,
    hand: <path d="M8 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v4c0 5-3 8-8 8h-1c-3 0-5-2-7-5l-2-3a1.7 1.7 0 0 1 2.7-2l3.3 3"/>,
    timeline: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    follow: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
    share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></>,
    export: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    leave: <><path d="M6 8c4-2 8-2 12 0l2 4-4 2-2-3H10l-2 3-4-2 2-4Z"/></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function DockButton({ icon, label, active = false, danger = false, badge, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 text-[var(--on-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-12 ${
        danger
          ? 'border-red-500/40 bg-red-500/15 text-red-600 hover:bg-red-500/25 dark:text-red-300'
          : active
            ? 'border-blue-500/45 bg-blue-500/15 text-blue-700 dark:text-blue-200'
            : 'border-transparent hover:bg-[var(--bg-muted)]'
      } ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
      <span className="hidden text-[11px] font-semibold xl:inline">{label}</span>
      {badge != null && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-primary)] px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

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
  const [menu, setMenu] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (event) => {
      if (!barRef.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menu]);

  const widgets = [
    { type: 'CODE_EDITOR', icon: 'code', label: 'Code editor' },
    { type: 'WHITEBOARD', icon: 'board', label: 'Whiteboard' },
    { type: 'NOTES', icon: 'notes', label: 'Live notes' },
    { type: 'WEB_BROWSER', icon: 'browser', label: 'Shared browser' },
    { type: 'MEETING_TIMER', icon: 'timer', label: 'Meeting timer' },
  ];

  const tray = 'room-drawer absolute bottom-14 z-50 p-2 text-[var(--on-surface)]';
  const menuRow = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]';

  return (
    <div
      ref={barRef}
      className="control-dock ftos-rise fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 p-1.5 sm:bottom-5 sm:gap-1.5 sm:p-2"
    >
      <DockButton icon={isMuted ? 'micOff' : 'mic'} label={isMuted ? 'Unmute' : 'Mute'} danger={isMuted} onClick={onToggleMic} aria-pressed={isMuted} />
      <DockButton icon={isCameraOff ? 'cameraOff' : 'camera'} label={isCameraOff ? 'Start video' : 'Stop video'} danger={isCameraOff} onClick={onToggleCamera} aria-pressed={isCameraOff} />
      {onToggleScreenShare && (
        <DockButton
          icon="screen"
          label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          active={isScreenSharing}
          disabled={!canShareScreen}
          onClick={onToggleScreenShare}
          aria-pressed={isScreenSharing}
        />
      )}

      <span className="mx-0.5 hidden h-7 w-px bg-[var(--surface-border)] sm:block" />

      <div className="relative">
        <DockButton
          icon="tools"
          label="Tools"
          active={menu === 'widgets'}
          disabled={!canEdit}
          onClick={() => setMenu((value) => (value === 'widgets' ? null : 'widgets'))}
          aria-expanded={menu === 'widgets'}
        />
        {menu === 'widgets' && (
          <div className={`${tray} bottom-14 left-1/2 w-56 -translate-x-1/2`}>
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]">Open in the room</p>
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
                  className={menuRow}
                  title={locked ? `Ask the host for ${widget.label.toLowerCase()} access` : undefined}
                >
                  <Icon name={widget.icon} size={16} />
                  <span className="flex-1">{widget.label}</span>
                  {locked && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Access required"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DockButton icon="chat" label="Chat" badge={unreadChatCount > 0 ? (unreadChatCount > 9 ? '9+' : unreadChatCount) : null} onClick={onToggleChat} />
      <DockButton icon="people" label="People" badge={participantCount} onClick={onToggleParticipants} />

      <div className="relative">
        <DockButton icon="more" label="More" active={menu === 'more'} onClick={() => setMenu((value) => (value === 'more' ? null : 'more'))} aria-expanded={menu === 'more'} />
        {menu === 'more' && (
          <div className={`${tray} bottom-14 right-0 w-60`}>
            <div className="mb-2 grid grid-cols-6 gap-1 border-b border-[var(--surface-border)] pb-2">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  type="button"
                  onClick={() => { onSendReaction?.(reaction); setMenu(null); }}
                  className="grid h-8 place-items-center rounded-md text-base transition-colors hover:bg-[var(--bg-muted)]"
                  aria-label={`React ${reaction}`}
                >
                  {reaction}
                </button>
              ))}
            </div>
            {onToggleRaiseHand && (
              <button type="button" onClick={() => { onToggleRaiseHand(); setMenu(null); }} className={`${menuRow} ${isHandRaised ? 'text-amber-600 dark:text-amber-300' : ''}`}>
                <Icon name="hand" size={16} /><span>{isHandRaised ? 'Lower hand' : 'Raise hand'}</span>
              </button>
            )}
            {onToggleTimeline && <button type="button" onClick={() => { onToggleTimeline(); setMenu(null); }} className={menuRow}><Icon name="timeline" size={16} /><span>Session timeline</span></button>}
            {onToggleFollow && <button type="button" onClick={() => { onToggleFollow(); setMenu(null); }} className={`${menuRow} ${followingPresenter ? 'text-blue-600 dark:text-blue-300' : ''}`}><Icon name="follow" size={16} /><span>{followingPresenter ? 'Stop following' : 'Follow presenter'}</span></button>}
            {onShareLink && <button type="button" onClick={() => { onShareLink(); setMenu(null); }} className={menuRow}><Icon name="share" size={16} /><span>Copy invite link</span></button>}
            {onExport && <button type="button" onClick={() => { onExport(); setMenu(null); }} className={menuRow}><Icon name="export" size={16} /><span>Export session</span></button>}
          </div>
        )}
      </div>

      <span className="mx-0.5 hidden h-7 w-px bg-[var(--surface-border)] sm:block" />

      <DockButton icon="leave" label="Leave" danger onClick={onEndCall} />
      {isHost && onEndForAll && (
        <button type="button" onClick={onEndForAll} className="hidden h-11 rounded-lg border border-red-600/50 bg-red-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-red-500 md:block">
          End for all
        </button>
      )}
    </div>
  );
}
