import React, { useState } from 'react';
import { Icon } from '../Icon.js';
import { registerContentSlot, SlotHeading, type ContentSlotProps } from './registry.js';

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
      <SlotHeading icon="question">Concept Checks</SlotHeading>
      {checks.map((check) => {
        const revealed = revealedIds.has(check.id);
        return (
          <div
            key={check.id}
            className={`rounded-xl border bg-surface-800/40 transition-colors ${revealed ? 'border-accent-500/30' : 'border-surface-700/60 hover:border-surface-600/80'}`}
          >
            <button
              type="button"
              onClick={() => toggleReveal(check.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer group"
            >
              <span className={`shrink-0 mt-0.5 transition-transform duration-200 text-surface-400 group-hover:text-surface-200 ${revealed ? 'rotate-90' : ''}`}>
                <Icon name="chevronRight" size={14} strokeWidth={2.5} />
              </span>
              <span className="flex-1 text-sm text-surface-200 leading-relaxed">{check.question}</span>
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-surface-500 group-hover:text-accent-400 transition-colors whitespace-nowrap">
                {revealed ? 'Hide' : 'Answer'}
              </span>
            </button>
            {revealed && (
              <div className="px-4 pb-4 pl-[2.6rem]">
                <div className="pt-2 border-t border-surface-700/50">
                  <p className="text-sm text-emerald-400">{check.answer}</p>
                  {check.answerExplanation && (
                    <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">{check.answerExplanation}</p>
                  )}
                </div>
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
