import React from 'react';
import { registerBlockRenderer } from './registry.js';
import type { BlockRendererProps } from './registry.js';
import type { DeeperPatternsBlock } from '../../../shared/document.js';
import { contentCard, sectionHeading } from '../../utils/styles.js';
import { Icon } from '../Icon.js';

function DeeperPatternsBlockRenderer({ block }: BlockRendererProps): React.ReactElement {
  const patternsBlock = block as DeeperPatternsBlock;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon name="link" className="text-surface-400" />
        <h4 className={sectionHeading}>Deeper Patterns</h4>
      </div>
      {patternsBlock.patterns.map((dp, index) => (
        <div key={`${dp.pattern}-${index}`} className={`${contentCard} border-surface-700/60 p-4`}>
          <p className="text-sm font-medium text-surface-100">{dp.pattern}</p>
          <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">{dp.connection}</p>
        </div>
      ))}
    </div>
  );
}

registerBlockRenderer('deeper-patterns', DeeperPatternsBlockRenderer);

export { DeeperPatternsBlockRenderer };
