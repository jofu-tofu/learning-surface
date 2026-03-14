import React from 'react';
import type { CanvasContent } from '../../shared/types.js';
import { Canvas } from './Canvas.js';

interface CanvasGridProps {
  canvases: CanvasContent[];
}

/**
 * Adaptive grid layout for 0–4 canvases.
 * - 0: empty state
 * - 1: full width
 * - 2: side by side
 * - 3+: 2-column grid
 */
export function CanvasGrid({ canvases }: CanvasGridProps): React.ReactElement {
  if (canvases.length === 0) {
    return <Canvas content={null} />;
  }

  if (canvases.length === 1) {
    return <Canvas content={canvases[0]} />;
  }

  return (
    <div className={`grid gap-3 w-full h-full ${canvases.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {canvases.map((canvas) => (
        <div key={canvas.id} className="min-w-0 min-h-0">
          <Canvas content={canvas} />
        </div>
      ))}
    </div>
  );
}
