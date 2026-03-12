import React, { useState } from 'react';

export interface PromptPreviewProps {
  prompt: string | null;
}

export function PromptPreview({ prompt }: PromptPreviewProps): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  if (!prompt) return null;

  return (
    <div className="shrink-0 border-t border-surface-700/50 bg-surface-800/60">
      <div className="px-5 py-2 flex items-start gap-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-surface-400 hover:text-surface-300 transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand prompt' : 'Collapse prompt'}
        >
          <svg
            className={`w-3 h-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Prompt
        </button>
        {!collapsed && (
          <p className="text-sm text-surface-200 leading-relaxed whitespace-pre-wrap break-words min-w-0">
            {prompt}
          </p>
        )}
        {collapsed && (
          <p className="text-sm text-surface-400 truncate min-w-0">{prompt}</p>
        )}
      </div>
    </div>
  );
}
