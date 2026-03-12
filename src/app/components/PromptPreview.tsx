import React from 'react';

export interface PromptPreviewProps {
  prompt: string | null;
}

export function PromptPreview({ prompt }: PromptPreviewProps): React.ReactElement | null {
  if (!prompt) return null;

  return (
    <div className="shrink-0 border-b border-surface-700/40 bg-surface-800/50">
      <div className="px-5 py-2.5 flex items-start gap-3">
        <span className="shrink-0 mt-0.5 text-[10px] uppercase tracking-widest font-semibold text-surface-400/80 select-none">
          Prompt
        </span>
        <p className="text-sm text-surface-200/90 leading-relaxed whitespace-pre-wrap break-words min-w-0">
          {prompt}
        </p>
      </div>
    </div>
  );
}
