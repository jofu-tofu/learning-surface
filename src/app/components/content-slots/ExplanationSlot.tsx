import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { registerContentSlot, type ContentSlotProps } from './registry.js';

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

function ExplanationSlot({ section }: ContentSlotProps): React.ReactElement | null {
  const renderedExplanation = useMemo(() => {
    const source = section.explanation ?? null;
    if (!source) return '';
    return markdownParser.render(source);
  }, [section.explanation]);

  return renderedExplanation ? (
    <div
      className="prose prose-surface prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderedExplanation }}
    />
  ) : null;
}

registerContentSlot('explanation', {
  id: 'explanation',
  component: ExplanationSlot,
  order: 10,
  hasContent: (section) => !!section.explanation,
});
