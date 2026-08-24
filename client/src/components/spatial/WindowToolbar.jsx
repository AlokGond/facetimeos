'use client';

import React from 'react';

export default function WindowToolbar({
  title,
  type,
  icon,
  badge,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized,
}) {
  // Keyed by WINDOW_TYPES, which is what actually gets passed in. The previous
  // map was keyed by lowercase aliases ('editor', 'notes'), so every real
  // window fell through to the fallback glyph.
  const typeIcons = {
    CODE_EDITOR: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    WHITEBOARD: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
      </svg>
    ),
    NOTES: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    WEB_BROWSER: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    MEETING_TIMER: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" />
      </svg>
    ),
  };

  return (
    <div className="window-drag-handle flex items-center justify-between px-4 py-2.5 bg-black/40 dark:bg-black/50 backdrop-blur-md cursor-move select-none border-b border-stone-200/50 dark:border-white/10 shrink-0">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className="text-stone-600 dark:text-white/70 shrink-0">
          {typeIcons[type] || <span aria-hidden="true">{icon || '🪟'}</span>}
        </span>
        <span className="text-sm font-semibold text-stone-800 dark:text-white/90 tracking-wide truncate">
          {title}
        </span>
        {badge && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-stone-200/70 dark:bg-white/10 text-stone-600 dark:text-white/60">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-1">
        {onMinimize && (
          <button 
            onClick={onMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-white/10 text-stone-500 dark:text-white/50 hover:text-stone-800 dark:hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
        {onMaximize && (
          <button 
            onClick={onMaximize}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-white/10 text-stone-500 dark:text-white/50 hover:text-stone-800 dark:hover:text-white transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 5V3h12v12h-2"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            )}
          </button>
        )}
        <button 
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-stone-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
}