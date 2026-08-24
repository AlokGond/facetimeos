'use client';

import React, { useMemo, useState } from 'react';
import { TIMELINE_KINDS } from '../../hooks/useRoomLog';

/**
 * The session timeline.
 *
 * This is the panel that has no equivalent in Meet, Zoom or Teams. Those apps
 * can hand you a recording; this hands you a record — who joined, which tools
 * were opened, what someone deliberately marked as a decision — kept in the room
 * document, so it is the same for everyone, survives a reload, and drops straight
 * into the export bundle.
 *
 * "Mark a decision" is the deliberate part. Automatic events are noise until
 * somebody says "this bit mattered", and one line typed during the call is worth
 * more than an hour of video nobody rewatches.
 */

const KIND_STYLE = {
  [TIMELINE_KINDS.decision]: { icon: '✅', className: 'border-emerald-500/30 bg-emerald-500/10' },
  [TIMELINE_KINDS.joined]: { icon: '👋', className: 'border-[var(--surface-border)] bg-[var(--bg-muted)]' },
  [TIMELINE_KINDS.left]: { icon: '🚪', className: 'border-[var(--surface-border)] bg-[var(--bg-muted)]' },
  [TIMELINE_KINDS.widget]: { icon: '🧩', className: 'border-indigo-500/25 bg-indigo-500/10' },
  [TIMELINE_KINDS.share]: { icon: '🖥️', className: 'border-blue-500/25 bg-blue-500/10' },
  [TIMELINE_KINDS.timer]: { icon: '⏰', className: 'border-amber-500/25 bg-amber-500/10' },
  [TIMELINE_KINDS.restored]: { icon: '📂', className: 'border-[var(--surface-border)] bg-[var(--bg-muted)]' },
  [TIMELINE_KINDS.role]: { icon: '🔑', className: 'border-amber-500/25 bg-amber-500/10' },
};

const FALLBACK = { icon: '•', className: 'border-[var(--surface-border)] bg-[var(--bg-muted)]' };

const clock = (at) =>
  Number.isFinite(at) ? new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export default function SessionTimeline({
  isOpen,
  onClose,
  events = [],
  decisionsOnly: initialDecisionsOnly = false,
  readOnly = false,
  exportStats,
  onMarkDecision,
  onExport,
}) {
  const [draft, setDraft] = useState('');
  const [decisionsOnly, setDecisionsOnly] = useState(initialDecisionsOnly);

  const shown = useMemo(() => {
    const list = decisionsOnly
      ? events.filter((event) => event.kind === TIMELINE_KINDS.decision)
      : events;
    // Newest last reads like a log; the panel scrolls to the bottom by default.
    return [...list].sort((a, b) => (a.at || 0) - (b.at || 0));
  }, [events, decisionsOnly]);

  const decisionCount = useMemo(
    () => events.filter((event) => event.kind === TIMELINE_KINDS.decision).length,
    [events]
  );

  if (!isOpen) return null;

  return (
    <div
      /* Full width on a phone, and clear of the control bar's second row — see the
         same note in ChatPanel. */
      className="ftos-fade fixed bottom-28 left-3 right-3 top-14 z-50 flex flex-col overflow-hidden rounded-2xl border shadow-2xl sm:bottom-24 sm:right-auto sm:left-4 sm:top-16 sm:w-96"
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
          <span className="text-sm font-semibold text-stone-800 dark:text-white">Session timeline</span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
            {decisionCount} decision{decisionCount === 1 ? '' : 's'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-xs text-[var(--on-surface-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--on-surface)]"
          aria-label="Close timeline"
        >
          ✕
        </button>
      </div>

      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--on-surface-muted)]">
          <input
            type="checkbox"
            checked={decisionsOnly}
            onChange={(event) => setDecisionsOnly(event.target.checked)}
            className="h-3 w-3 accent-emerald-500"
          />
          Decisions only
        </label>
        <span className="text-[10px] text-[var(--on-surface-muted)]">{shown.length} shown</span>
      </div>

      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[var(--on-surface-muted)]">
            <span className="mb-2 text-3xl opacity-50">🗂️</span>
            <p className="text-xs font-medium">
              {decisionsOnly ? 'No decisions marked yet' : 'Nothing recorded yet'}
            </p>
            <p className="mt-1 text-[11px] text-[var(--on-surface-muted)]">
              Joins, tools opened and screen shares are recorded automatically. Type below to mark
              the moments that mattered — they end up in the export.
            </p>
          </div>
        ) : (
          shown.map((event) => {
            const style = KIND_STYLE[event.kind] || FALLBACK;
            const isDecision = event.kind === TIMELINE_KINDS.decision;
            return (
              <div
                key={event.id}
                className={`flex gap-2.5 rounded-xl border p-2.5 ${style.className}`}
              >
                <span className="mt-0.5 shrink-0 text-sm" aria-hidden="true">
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`break-words text-xs leading-relaxed ${
                      isDecision
                        ? 'font-semibold text-stone-800 dark:text-white'
                        : 'text-stone-700 dark:text-white/80'
                    }`}
                  >
                    {event.text || event.kind}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--on-surface-muted)]">
                    <span>{clock(event.at)}</span>
                    {event.byName && (
                      <>
                        <span>·</span>
                        <span>{event.byName}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!readOnly && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            onMarkDecision?.(text);
            setDraft('');
          }}
          className="flex items-center gap-2 border-t p-3"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={500}
            placeholder="Mark a decision…"
            className="flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-input)] px-3.5 py-2 text-xs text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] transition-colors focus:border-emerald-500 focus:outline-none "
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark
          </button>
        </form>
      )}

      <div
        className="border-t p-3"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}
      >
        <button
          type="button"
          onClick={onExport}
          className="w-full rounded-xl bg-[var(--accent-primary,#3b82f6)] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
        >
          ⬇️ Export this session
        </button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--on-surface-muted)]">
          {exportStats
            ? `${exportStats.notesWords || 0} words of notes · ${exportStats.strokes || 0} strokes · ${exportStats.messages || 0} messages`
            : 'Notes, code, whiteboard, transcript and this timeline — as files you keep.'}
        </p>
      </div>
    </div>
  );
}
