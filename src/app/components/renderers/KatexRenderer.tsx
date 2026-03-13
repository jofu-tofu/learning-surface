import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';
import { ErrorBanner } from '../ErrorBanner.js';
import type { RendererProps } from './registry.js';

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
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <div className="w-4 h-4 border-2 border-surface-500 border-t-accent-400 rounded-full animate-spin" />
          Loading math...
        </div>
      )}
      {error && <ErrorBanner message={error} />}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
