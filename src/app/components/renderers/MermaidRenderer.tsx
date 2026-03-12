import React from 'react';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';

const MERMAID_KEYWORDS = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|sankey|xy|block|quadrant|requirement|C4Context|C4Container|C4Component|C4Deployment|C4Dynamic)\b/;

function isMermaidSyntaxValid(content: string): boolean {
  return MERMAID_KEYWORDS.test(content);
}

export function MermaidRenderer({ content }: { content: string }): React.ReactElement {
  const syntaxValid = isMermaidSyntaxValid(content);

  const { html: svg, error: asyncError, loading } = useAsyncRender(
    async () => {
      if (!syntaxValid) throw new Error('invalid mermaid syntax');
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      const id = `mermaid-${Date.now()}`;
      const { svg: rendered } = await mermaid.render(id, content);
      return rendered;
    },
    [content],
    {
      loading: syntaxValid,
      error: syntaxValid ? null : 'Error: invalid mermaid syntax',
    },
  );

  const error = syntaxValid ? asyncError : 'Error: invalid mermaid syntax';

  return (
    <div data-testid="canvas-mermaid" className="canvas-container">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <div className="w-4 h-4 border-2 border-surface-500 border-t-accent-400 rounded-full animate-spin" />
          Loading diagram...
        </div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}
      {svg && <div dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
}
