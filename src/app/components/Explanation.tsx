import React from 'react';
import type { Check } from '../../shared/types.js';
import { useMarkdown } from '../hooks/useMarkdown.js';
import { useIsProcessing } from '../hooks/SurfaceStatusContext.js';
import { EmptyState } from './EmptyState.js';
import { Icon } from './Icon.js';
import { sectionHeading, focusRing } from '../utils/styles.js';

interface ExplanationProps {
  explanation: string | null;
  checks: Check[];
  followups: string[];
  onFollowupClick?: (question: string) => void;
}

const explanationEmptyIcon = (
  <Icon name="document" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function Explanation({ explanation, checks, followups, onFollowupClick }: ExplanationProps): React.ReactElement {
  const renderedExplanation = useMarkdown(explanation);
  const isProcessing = useIsProcessing();

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
          <h3 className={`${sectionHeading} flex items-center gap-2`}>
            <Icon name="question" className="w-3.5 h-3.5" size={14} />
            Concept Checks
          </h3>
          {checks.map((check) => (
            <div
              key={check.id}
              className="rounded-xl border border-surface-700/60 bg-surface-800/40 p-4"
            >
              <p className="text-sm text-surface-200 mb-3 leading-relaxed">{check.question}</p>
              {check.answer && (
                <div className="mt-2 pt-3 border-t border-surface-700/50">
                  <p className="text-sm text-emerald-400">{check.answer}</p>
                  {check.answerExplanation && (
                    <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">{check.answerExplanation}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {followups.length > 0 && (
        <div className="space-y-3">
          <h3 className={`${sectionHeading} flex items-center gap-2`}>
            <Icon name="send" className="w-3.5 h-3.5" size={14} />
            Explore Further
          </h3>
          <div className="flex flex-wrap gap-2">
            {followups.map((followupQuestion) => (
              <button
                key={followupQuestion}
                onClick={() => onFollowupClick?.(followupQuestion)}
                disabled={isProcessing}
                className={`px-3.5 py-2 text-xs font-medium rounded-xl bg-accent-600/10 text-accent-400 border border-accent-500/20 hover:bg-accent-600/20 hover:border-accent-500/40 hover:shadow-sm hover:shadow-accent-500/5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-600/10 disabled:hover:border-accent-500/20 ${focusRing}`}
              >
                {followupQuestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!explanation && checks.length === 0 && followups.length === 0 && (
        <EmptyState icon={explanationEmptyIcon} message="Select a section to see its explanation" />
      )}
    </div>
  );
}
