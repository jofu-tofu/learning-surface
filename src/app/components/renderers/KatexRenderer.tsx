import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';

export function KatexRenderer({ content }: { content: string }): React.ReactElement {
  const { html, error } = useAsyncRender(
    async () => {
      const katex = (await import('katex')).default;
      return katex.renderToString(content, { throwOnError: false });
    },
    [content],
  );

  return (
    <div data-testid="canvas-katex" className="canvas-container overflow-x-auto">
      {error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html ?? '' }} />
      )}
    </div>
  );
}
