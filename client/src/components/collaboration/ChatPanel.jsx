'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Room chat, backed by the shared document.
 *
 * The old panel took `messages` from React state in the room page, each entry
 * carrying a pre-rendered `timestamp` string and an `isLocal` boolean baked in
 * by the sender. Three problems: a late joiner saw nothing that was said before
 * they arrived, a reload wiped the conversation, and `isLocal` was decided by
 * whoever constructed the message rather than by who is reading it — so a
 * relayed message could render as your own.
 *
 * Now the transcript is a `Y.Array` in the room document: ordered, persisted,
 * available to a late joiner in full, and part of the exported bundle. `isLocal`
 * is derived here from `from === localPeerId`, and the time is formatted at
 * render from the stored epoch, so it is correct in every reader's timezone.
 */

const QUICK = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

function timeOf(at) {
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Group consecutive messages from one person so the name is not repeated. */
function groupMessages(messages) {
  const groups = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    const sameSender = last && last.from === message.from;
    const closeInTime = last && Math.abs((message.at || 0) - (last.at || 0)) < 120_000;
    if (sameSender && closeInTime) {
      last.items.push(message);
      last.at = message.at;
    } else {
      groups.push({ from: message.from, name: message.name, at: message.at, items: [message] });
    }
  }
  return groups;
}

export default function ChatPanel({
  isOpen,
  onClose,
  messages = [],
  localPeerId,
  readOnly = false,
  typingNames = [],
  onSend,
  onTyping,
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  /* Scroll to the newest message. This is a DOM side effect, not a state write,
     so it belongs in an effect. */
  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = useCallback(
    (event) => {
      event.preventDefault();
      const text = draft.trim();
      if (!text || readOnly) return;
      onSend?.(text);
      setDraft('');
    },
    [draft, readOnly, onSend]
  );

  const change = useCallback(
    (event) => {
      setDraft(event.target.value);
      onTyping?.();
    },
    [onTyping]
  );

  if (!isOpen) return null;

  return (
    <div
      /* On a phone the panel spans the width rather than floating in a 320px
         column with 16px of dead space beside it, and it stops higher up: the
         control bar wraps to two rows down there, and `bottom-24` put the message
         composer underneath it. */
      className="ftos-fade fixed bottom-28 left-3 right-3 top-14 z-50 flex flex-col overflow-hidden rounded-2xl border shadow-2xl sm:bottom-24 sm:left-auto sm:right-4 sm:top-16 sm:w-96"
      style={{
        background: 'var(--surface-panel)',
        borderColor: 'var(--surface-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3.5"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-800 dark:text-white">Room chat</span>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
            {messages.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[var(--on-surface-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--on-surface)]"
          aria-label="Close chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[var(--on-surface-muted)]">
            <span className="mb-2 text-3xl opacity-50">💬</span>
            <p className="text-xs font-medium">Nothing said yet</p>
            <p className="mt-1 text-[11px] text-[var(--on-surface-muted)]">
              The transcript is saved with the room, so anyone joining later can read back.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const isLocal = group.from === localPeerId;
            return (
              <div
                key={`${group.from}-${group.items[0].id}`}
                className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-[var(--on-surface-muted)]">
                  <span className="font-semibold text-stone-700 dark:text-white/80">
                    {isLocal ? 'You' : group.name || 'Participant'}
                  </span>
                  <span>·</span>
                  <span>{timeOf(group.at)}</span>
                </div>
                <div className={`flex w-full flex-col gap-1 ${isLocal ? 'items-end' : 'items-start'}`}>
                  {group.items.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                        isLocal
                          ? 'rounded-tr-sm bg-[var(--accent-primary,#3b82f6)] text-white'
                          : 'rounded-tl-sm border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--on-surface)]'
                      }`}
                    >
                      {message.text}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {typingNames.length > 0 && (
        <div className="px-4 pb-1 text-[11px] italic text-[var(--on-surface-muted)]">
          {typingNames.slice(0, 2).join(', ')}
          {typingNames.length > 2 ? ` and ${typingNames.length - 2} more` : ''}
          {typingNames.length === 1 ? ' is typing…' : ' are typing…'}
        </div>
      )}

      {!readOnly && (
        <div
          className="flex items-center justify-around border-t bg-[var(--bg-muted)] px-3 py-1.5"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          {QUICK.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((prev) => prev + emoji)}
              className="rounded p-1 text-sm transition-transform hover:scale-125 hover:bg-[var(--bg-muted)]"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={change}
          maxLength={2000}
          disabled={readOnly}
          placeholder={readOnly ? 'View-only access' : 'Message the room…'}
          className="flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-input)] px-3.5 py-2 text-xs text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] transition-colors focus:border-[var(--accent-primary,#3b82f6)] focus:outline-none disabled:opacity-50 "
        />
        <button
          type="submit"
          disabled={!draft.trim() || readOnly}
          className="flex items-center justify-center rounded-xl bg-[var(--accent-primary,#3b82f6)] p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  );
}
