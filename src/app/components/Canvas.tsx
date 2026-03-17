import React from 'react';
import type { CanvasContent } from '../../shared/types.js';
import { getRenderer } from './renderers/registry.js';
import { EmptyState } from './EmptyState.js';
import { ProcessingState } from './ProcessingState.js';
import { Icon } from './Icon.js';
import { useContainerSize } from '../hooks/useContainerSize.js';
import { useIsProcessing } from '../hooks/SurfaceStatusContext.js';

interface CanvasProps {
  content: CanvasContent | null;
}

const canvasEmptyIcon = (
  <Icon name="grid" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

/* eslint-disable react-hooks/static-components -- getRenderer is a registry lookup, not component creation */
export function Canvas({ content }: CanvasProps): React.ReactElement {
  const { ref, size } = useContainerSize();
  const isProcessing = useIsProcessing();

  if (!content) {
    if (isProcessing) {
      return <ProcessingState message="Generating visual..." />;
    }
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

  return (
    <div ref={ref} className="w-full h-full">
      <Renderer
        content={content.content}
        language={content.language}
        containerWidth={size.width}
        containerHeight={size.height}
      />
    </div>
  );
}
/* eslint-enable react-hooks/static-components */
