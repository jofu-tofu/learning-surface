import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';
import type { RendererProps } from './registry.js';

export function CodeRenderer({ content, language }: RendererProps): React.ReactElement {
  const { html } = useAsyncRender(
    async () => {
      const shiki = await import('shiki');
      const highlighter = await shiki.createHighlighter({
        themes: ['github-dark'],
        langs: [language || 'text'],
      });
      return highlighter.codeToHtml(content, {
        lang: language || 'text',
        theme: 'github-dark',
      });
    },
    [content, language],
  );

  return (
    <div data-testid="canvas-code" className="canvas-container w-full">
      {html ? (
        <div className="rounded-lg overflow-hidden [&_pre]:!rounded-lg [&_pre]:!p-4" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="bg-surface-800 rounded-lg p-4 overflow-x-auto text-sm">
          <code className={`text-surface-200 ${language ? `language-${language}` : ''}`}>
            {content}
          </code>
        </pre>
      )}
    </div>
  );
}
