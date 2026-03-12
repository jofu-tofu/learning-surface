import React from 'react';
import type { Check } from '../../shared/types.js';
import { useMarkdown } from '../hooks/useMarkdown.js';

export interface ExplanationProps {
  explanation: string | null;
  checks: Check[];
  followups: string[];
  onFollowupClick?: (question: string) => void;
}

export function Explanation({ explanation, checks, followups, onFollowupClick }: ExplanationProps): React.ReactElement {
  const renderedExplanation = useMarkdown(explanation);

  return (
    <div className="explanation-pane space-y-6">
      {/* Rendered explanation */}
      {renderedExplanation && (
        <div
          className="prose prose-surface prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedExplanation }}
        />
      )}

      {/* Concept checks */}
      {checks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Concept Checks
          </h3>
          {checks.map((check) => (
            <div
              key={check.id}
              className="rounded-lg border border-surface-700 bg-surface-800/50 p-4"
            >
              <p className="text-sm text-surface-200 mb-3">{check.question}</p>
              {check.status === 'unanswered' && (
                <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer">
                  Think
                </button>
              )}
              {check.status === 'revealed' && check.answer && (
                <div className="mt-2 pt-3 border-t border-surface-700">
                  <p className="text-sm text-emerald-400">{check.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {followups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Explore Further
          </h3>
          <div className="flex flex-wrap gap-2">
            {followups.map((q) => (
              <button
                key={q}
                onClick={() => onFollowupClick?.(q)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-accent-600/15 text-accent-400 border border-accent-500/30 hover:bg-accent-600/25 hover:border-accent-500/50 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!explanation && checks.length === 0 && followups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-surface-500">
          <svg className="w-10 h-10 mb-3 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="text-sm italic">Select a section to see its explanation</p>
        </div>
      )}
    </div>
  );
}
