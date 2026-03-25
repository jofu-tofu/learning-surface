import React from 'react';
import { registerBlockRenderer } from './registry.js';
import type { BlockRendererProps } from './registry.js';
import type { SuggestionsBlock } from '../../../shared/document.js';
import { focusRing, sectionHeading } from '../../utils/styles.js';
import { Icon } from '../Icon.js';
import { useIsProcessing } from '../../hooks/ProcessingContext.js';

function SuggestionsBlockRenderer({ block, onSuggestionClick }: BlockRendererProps): React.ReactElement {
  const suggestionsBlock = block as SuggestionsBlock;
  const isProcessing = useIsProcessing();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon name="send" className="text-surface-400" />
        <h4 className={sectionHeading}>Explore Further</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestionsBlock.items.map((item) => (
          <button
            key={item}
            onClick={() => onSuggestionClick?.(item)}
            disabled={isProcessing}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl bg-accent-600/10 text-accent-400 border border-accent-500/20 hover:bg-accent-600/20 hover:border-accent-500/40 hover:shadow-sm hover:shadow-accent-500/5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-600/10 disabled:hover:border-accent-500/20 ${focusRing}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

registerBlockRenderer('suggestions', SuggestionsBlockRenderer);

export { SuggestionsBlockRenderer };
