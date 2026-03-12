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
        mermaid.initialize({ startOnLoad: false });
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
    <div data-testid="canvas-mermaid" ref={containerRef}>
      {loading && <div>Loading...</div>}
      {error && <div>{error}</div>}
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
    <div data-testid="canvas-katex">
      {error ? (
        <div>{error}</div>
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
    <div data-testid="canvas-code">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code className={language ? `language-${language}` : undefined}>
            {content}
          </code>
        </pre>
      )}
    </div>
  );
}

export function Canvas({ content }: CanvasProps): React.ReactElement {
  if (!content) {
    return <div data-testid="canvas-empty" />;
  }

  switch (content.type) {
    case 'mermaid':
      return <MermaidRenderer content={content.content} />;
    case 'katex':
      return <KatexRenderer content={content.content} />;
    case 'code':
      return <CodeRenderer content={content.content} language={content.language} />;
    default:
      return <div>Unsupported canvas type</div>;
  }
}
