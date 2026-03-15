import React from 'react';
import { Icon } from '../Icon.js';
import { sectionHeading } from '../../utils/styles.js';
import { registerContentSlot, type ContentSlotProps } from './registry.js';

function DeeperPatternsSlot({ section }: ContentSlotProps): React.ReactElement {
  const patterns = section.deeperPatterns ?? [];
  return (
    <div className="space-y-3">
      <h3 className={`${sectionHeading} flex items-center gap-2`}>
        <Icon name="link" className="w-3.5 h-3.5" size={14} />
        Deeper Patterns
      </h3>
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
