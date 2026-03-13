import React from 'react';
import type { CanvasContent } from '../../shared/types.js';
import { getRenderer } from './renderers/registry.js';
import { EmptyState } from './EmptyState.js';
import { Icon } from './Icon.js';

export interface CanvasProps {
  content: CanvasContent | null;
}

const canvasEmptyIcon = (
  <Icon name="grid" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function Canvas({ content }: CanvasProps): React.ReactElement {
  if (!content) {
    return (
      <div data-testid="canvas-empty">
        <EmptyState icon={canvasEmptyIcon} message="No visual content yet" />
      </div>
    );
  }

  const Renderer = getRenderer(content.type);
  if (!Renderer) {
    return <div className="text-sm text-surface-400">Unsupported canvas type</div>;
  }

  return <Renderer content={content.content} language={content.language} />;
}
