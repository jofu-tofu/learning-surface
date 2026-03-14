import React, { useState } from 'react';
import { Icon } from '../Icon.js';
import { sectionHeading } from '../../utils/styles.js';
import { registerContentSlot, type ContentSlotProps } from './registry.js';

function ChecksSlot({ section }: ContentSlotProps): React.ReactElement {
  const checks = section.checks ?? [];
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3 className={`${sectionHeading} flex items-center gap-2`}>
        <Icon name="question" className="w-3.5 h-3.5" size={14} />
        Concept Checks
      </h3>
      {checks.map((check) => {
        const revealed = revealedIds.has(check.id);
        return (
          <div
            key={check.id}
            className="rounded-xl border border-surface-700/60 bg-surface-800/40 p-4"
          >
            <p className="text-sm text-surface-200 leading-relaxed">{check.question}</p>
            <button
              type="button"
              onClick={() => toggleReveal(check.id)}
              className="mt-3 text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors cursor-pointer"
            >
              {revealed ? 'Hide answer' : 'Show answer'}
            </button>
            {revealed && (
              <div className="mt-2 pt-3 border-t border-surface-700/50">
                <p className="text-sm text-emerald-400">{check.answer}</p>
                {check.answerExplanation && (
                  <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">{check.answerExplanation}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

registerContentSlot('checks', {
  component: ChecksSlot,
  order: 20,
  hasContent: (section) => (section.checks ?? []).length > 0,
});
