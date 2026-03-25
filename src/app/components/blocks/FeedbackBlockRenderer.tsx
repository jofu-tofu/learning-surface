import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { registerBlockRenderer } from './registry.js';
import type { BlockRendererProps } from './registry.js';
import type { FeedbackBlock } from '../../../shared/document.js';
import { contentCard } from '../../utils/styles.js';

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

function CorrectIndicator({ correct }: { correct: boolean | null }): React.ReactElement {
  if (correct === true) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-sm font-medium">Correct</span>
      </div>
    );
  }
  if (correct === false) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span className="text-sm font-medium">Incorrect</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-surface-400">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      <span className="text-sm font-medium">Feedback</span>
    </div>
  );
}

function FeedbackBlockRenderer({ block }: BlockRendererProps): React.ReactElement {
  const feedbackBlock = block as FeedbackBlock;

  const rendered = useMemo(() => {
    if (!feedbackBlock.content) return '';
    return markdownParser.render(feedbackBlock.content);
  }, [feedbackBlock.content]);

  return (
    <div className={`${contentCard} border-surface-700/60 p-4 space-y-3`}>
      <CorrectIndicator correct={feedbackBlock.correct} />
      {rendered && (
        <div
          className="prose prose-surface prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      )}
    </div>
  );
}

registerBlockRenderer('feedback', FeedbackBlockRenderer);

export { FeedbackBlockRenderer };
