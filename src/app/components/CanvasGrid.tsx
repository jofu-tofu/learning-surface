import React, { useMemo } from 'react';
import type { CanvasContent } from '../../shared/types.js';
import { Canvas } from './Canvas.js';
import { useContentRefresh } from '../hooks/useContentRefresh.js';

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
  const fingerprint = useMemo(
    () => canvases.map(c => `${c.id}:${c.content}`).join('|'),
    [canvases],
  );
  const refreshRef = useContentRefresh(fingerprint, 0);

  if (canvases.length === 0) {
    return <Canvas content={null} />;
  }

  if (canvases.length === 1) {
    return (
      <div ref={refreshRef} className="w-full h-full">
        <Canvas content={canvases[0]} />
      </div>
    );
  }

  return (
    <div ref={refreshRef} className={`grid gap-3 w-full h-full ${canvases.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {canvases.map((canvas) => (
        <div key={canvas.id} className="min-w-0 min-h-0">
          <Canvas content={canvas} />
        </div>
      ))}
    </div>
  );
}
