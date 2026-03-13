import React from 'react';
import { Icon } from '../Icon.js';
import { sectionHeading } from '../../utils/styles.js';
import { registerContentSlot, type ContentSlotProps } from './registry.js';

function ChecksSlot({ section }: ContentSlotProps): React.ReactElement {
  const checks = section.checks ?? [];

  return (
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
  );
}

registerContentSlot('checks', {
  component: ChecksSlot,
  order: 20,
  hasContent: (section) => (section.checks ?? []).length > 0,
});
