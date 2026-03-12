import React, { useState, useEffect, useRef } from 'react';
import type { CanvasContent } from '../../shared/types.js';

export interface CanvasProps {
  content: CanvasContent | null;
}

const MERMAID_KEYWORDS = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|sankey|xy|block|quadrant|requirement|C4Context|C4Container|C4Component|C4Deployment|C4Dynamic)\b/;

function isMermaidSyntaxValid(content: string): boolean {
  return MERMAID_KEYWORDS.test(content);
}

function MermaidRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() =>
    isMermaidSyntaxValid(content) ? null : 'Error: invalid mermaid syntax'
  );
  const [loading, setLoading] = useState(() => isMermaidSyntaxValid(content));

  useEffect(() => {
    if (!isMermaidSyntaxValid(content)) {
      setError('Error: invalid mermaid syntax');
      setLoading(false);
      setSvg(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSvg(null);

    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, content);
        if (!cancelled) {
          setSvg(rendered);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(`Error: ${e instanceof Error ? e.message : String(e)}`);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div data-testid="canvas-mermaid" ref={containerRef} className="canvas-container">
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

function KatexRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const katex = require('katex');
      setHtml(katex.renderToString(content, { throwOnError: false }));
    } catch (e) {
      try {
        import('katex').then((mod) => {
          const k = mod.default || mod;
          setHtml(k.renderToString(content, { throwOnError: false }));
        }).catch((err) => {
          setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        });
      } catch {
        setError(`Error rendering KaTeX`);
      }
    }
  }, [content]);

  return (
    <div data-testid="canvas-katex" className="canvas-container overflow-x-auto">
      {error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

function CodeRenderer({ content, language }: { content: string; language?: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const shiki = await import('shiki');
        const highlighter = await shiki.createHighlighter({
          themes: ['github-dark'],
          langs: [language || 'text'],
        });
        const highlighted = highlighter.codeToHtml(content, {
          lang: language || 'text',
          theme: 'github-dark',
        });
        if (!cancelled) setHtml(highlighted);
      } catch {
        // fall back to plain pre/code
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content, language]);

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

export function Canvas({ content }: CanvasProps): React.ReactElement {
  if (!content) {
    return (
      <div data-testid="canvas-empty" className="flex flex-col items-center justify-center py-12 text-surface-500">
        <svg className="w-10 h-10 mb-3 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <p className="text-sm italic">No visual content yet</p>
      </div>
    );
  }

  switch (content.type) {
    case 'mermaid':
      return <MermaidRenderer content={content.content} />;
    case 'katex':
      return <KatexRenderer content={content.content} />;
    case 'code':
      return <CodeRenderer content={content.content} language={content.language} />;
    default:
      return <div className="text-sm text-surface-400">Unsupported canvas type</div>;
  }
}
