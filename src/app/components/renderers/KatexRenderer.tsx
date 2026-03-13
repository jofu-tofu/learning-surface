import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';
import { ErrorBanner } from '../ErrorBanner.js';
import type { RendererProps } from './registry.js';

export function KatexRenderer({ content }: RendererProps): React.ReactElement {
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
        <ErrorBanner message={error} />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html ?? '' }} />
      )}
    </div>
  );
}
