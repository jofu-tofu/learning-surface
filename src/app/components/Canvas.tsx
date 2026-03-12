import React from 'react';
import type { CanvasContent } from '../../shared/types.js';
import { MermaidRenderer } from './renderers/MermaidRenderer.js';
import { KatexRenderer } from './renderers/KatexRenderer.js';
import { CodeRenderer } from './renderers/CodeRenderer.js';
import { EmptyState } from './EmptyState.js';

export interface CanvasProps {
  content: CanvasContent | null;
}

const canvasEmptyIcon = (
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

export function Canvas({ content }: CanvasProps): React.ReactElement {
  if (!content) {
    return (
      <div data-testid="canvas-empty">
        <EmptyState icon={canvasEmptyIcon} message="No visual content yet" />
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
