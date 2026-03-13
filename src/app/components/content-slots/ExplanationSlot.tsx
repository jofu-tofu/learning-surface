import React from 'react';
import { useMarkdown } from '../../hooks/useMarkdown.js';
import { registerContentSlot, type ContentSlotProps } from './registry.js';

function ExplanationSlot({ section }: ContentSlotProps): React.ReactElement {
  const renderedExplanation = useMarkdown(section.explanation ?? null);

  return (
    <>
      {renderedExplanation && (
        <div
          className="prose prose-surface prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedExplanation }}
        />
      )}
    </>
  );
}

registerContentSlot('explanation', {
  component: ExplanationSlot,
  order: 10,
  hasContent: (section) => !!section.explanation,
});
