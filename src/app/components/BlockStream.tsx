import React, { useState, useCallback, useMemo } from 'react';
import type { Block } from '../../shared/document.js';
import { getBlockRenderer } from './blocks/registry.js';
import { useIsProcessing } from '../hooks/ProcessingContext.js';
import { ProcessingState } from './ProcessingState.js';
import { EmptyState } from './EmptyState.js';
import { Icon } from './Icon.js';

// Side-effect imports to trigger block renderer registration
import './blocks/TextBlockRenderer.js';
import './blocks/InteractiveBlockRenderer.js';
import './blocks/FeedbackBlockRenderer.js';
import './blocks/DeeperPatternsBlockRenderer.js';
import './blocks/SuggestionsBlockRenderer.js';

interface BlockStreamProps {
  blocks: Block[];
  onSubmitResponses: (responses: Record<string, string>) => void;
  onSuggestionClick: (text: string) => void;
}

const emptyIcon = (
  <Icon name="document" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function BlockStream({ blocks, onSubmitResponses, onSuggestionClick }: BlockStreamProps): React.ReactElement {
  const isProcessing = useIsProcessing();
  const [localResponses, setLocalResponses] = useState<Record<string, string>>({});

  const handleResponseChange = useCallback((blockId: string, value: string) => {
    setLocalResponses(prev => ({ ...prev, [blockId]: value }));
  }, []);

  const hasUnansweredInteractive = useMemo(() => {
    return blocks.some(b => b.type === 'interactive' && b.response == null);
  }, [blocks]);

  const filledResponses = useMemo(() => {
    const filled: Record<string, string> = {};
    for (const [id, value] of Object.entries(localResponses)) {
      if (value.trim().length > 0) {
        filled[id] = value;
      }
    }
    return filled;
  }, [localResponses]);

  const canSubmit = Object.keys(filledResponses).length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmitResponses(filledResponses);
  }, [canSubmit, filledResponses, onSubmitResponses]);

  if (blocks.length === 0) {
    return (
      <div className="explanation-pane space-y-6">
        {isProcessing
          ? <ProcessingState message="Generating content..." />
          : <EmptyState icon={emptyIcon} message="Ask a question to get started" />}
      </div>
    );
  }

  return (
    <div className="explanation-pane space-y-6">
      {blocks.map(block => {
        const Renderer = getBlockRenderer(block.type);
        if (!Renderer) return null;
        return (
          <Renderer
            key={block.id}
            block={block}
            onResponseChange={handleResponseChange}
            onSuggestionClick={onSuggestionClick}
          />
        );
      })}

      {hasUnansweredInteractive && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isProcessing}
          className="w-full h-10 bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Submitting...' : 'Submit responses'}
        </button>
      )}

      {isProcessing && blocks.length > 0 && (
        <ProcessingState message="Processing..." />
      )}
    </div>
  );
}
