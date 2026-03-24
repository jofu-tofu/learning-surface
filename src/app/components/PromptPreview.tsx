import React from 'react';
import { sectionLabel } from '../utils/styles.js';

interface PromptPreviewProps {
  prompt: string | null;
}

export const PromptPreview = React.memo(function PromptPreview({ prompt }: PromptPreviewProps): React.ReactElement | null {
  if (!prompt) return null;

  return (
    <div className="shrink-0 border-b border-surface-700/40 bg-surface-800/50">
      <div className="px-5 py-2.5 flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 ${sectionLabel} select-none`}>
          Prompt
        </span>
        <p className="text-sm text-surface-200/90 leading-relaxed whitespace-pre-wrap break-words min-w-0">
          {prompt}
        </p>
      </div>
    </div>
  );
});
