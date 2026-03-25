import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { registerBlockRenderer } from './registry.js';
import type { BlockRendererProps } from './registry.js';
import type { TextBlock } from '../../../shared/document.js';

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

function TextBlockRenderer({ block }: BlockRendererProps): React.ReactElement | null {
  const textBlock = block as TextBlock;

  const rendered = useMemo(() => {
    if (!textBlock.content) return '';
    return markdownParser.render(textBlock.content);
  }, [textBlock.content]);

  return rendered ? (
    <div
      className="prose prose-surface prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  ) : null;
}

registerBlockRenderer('text', TextBlockRenderer);

export { TextBlockRenderer };
