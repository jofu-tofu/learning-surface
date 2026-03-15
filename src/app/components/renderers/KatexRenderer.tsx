import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';
import { ErrorBanner } from '../ErrorBanner.js';
import type { RendererProps } from './registry.js';
import { LoadingSpinner } from '../LoadingSpinner.js';

export function KatexRenderer({ content }: RendererProps): React.ReactElement {
  const { html, error, loading } = useAsyncRender(
    async () => {
      const katex = (await import('katex')).default;
      return katex.renderToString(content, { throwOnError: false });
    },
    [content],
  );

  return (
    <div data-testid="canvas-katex" className="canvas-container overflow-x-auto">
      {loading && <LoadingSpinner label="Loading math..." />}
      {error && <ErrorBanner message={error} />}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
