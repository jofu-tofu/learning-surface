import React from 'react';
import { registerContentSlot, SlotHeading, type ContentSlotProps } from './registry.js';

function DeeperPatternsSlot({ section }: ContentSlotProps): React.ReactElement {
  const patterns = section.deeperPatterns ?? [];
  return (
    <div className="space-y-3">
      <SlotHeading icon="link">Deeper Patterns</SlotHeading>
      {patterns.map((dp, index) => (
        <div key={index} className="rounded-xl border border-surface-700/60 bg-surface-800/40 p-4">
          <p className="text-sm font-medium text-surface-100">{dp.pattern}</p>
          <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">{dp.connection}</p>
        </div>
      ))}
    </div>
  );
}

registerContentSlot('deeperPatterns', {
  component: DeeperPatternsSlot,
  order: 15,
  hasContent: (section) => (section.deeperPatterns ?? []).length > 0,
});
