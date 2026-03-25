import React, { useState, useMemo, useEffect } from 'react';
import type { CanvasContent } from '../../shared/document.js';
import { Canvas } from './Canvas.js';
import { Icon } from './Icon.js';
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
 *
 * When multiple canvases are present, clicking one focuses it
 * to fill the entire area. A back button returns to the grid view.
 */
export function CanvasGrid({ canvases }: CanvasGridProps): React.ReactElement {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const fingerprint = useMemo(
    () => canvases.map(c => `${c.id}:${c.content}`).join('|'),
    [canvases],
  );
  const refreshRef = useContentRefresh(fingerprint, 0);

  // Escape key exits focus mode (stopImmediatePropagation so App-level
  // fullscreen handler doesn't also fire on the same keydown event)
  useEffect(() => {
    if (!focusedId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setFocusedId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focusedId]);

  // Reset focus when canvases change and the focused one no longer exists
  useEffect(() => {
    if (focusedId && !canvases.find(c => c.id === focusedId)) {
      setFocusedId(null);
    }
  }, [focusedId, canvases]);

  const focusedCanvas = focusedId ? canvases.find(c => c.id === focusedId) : null;

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

  // Focused view — single canvas fills the area with a back button
  if (focusedCanvas) {
    return (
      <div ref={refreshRef} className="w-full h-full flex flex-col">
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5">
          <button
            onClick={() => setFocusedId(null)}
            title="Back to grid"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
          >
            <Icon name="arrowLeft" size={12} strokeWidth={2} />
            <span>All canvases</span>
          </button>
          <span className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">{focusedCanvas.id}</span>
        </div>
        <div className="flex-1 min-h-0">
          <Canvas content={focusedCanvas} />
        </div>
      </div>
    );
  }

  // Grid view — each canvas is clickable to focus
  return (
    <div ref={refreshRef} className={`grid gap-3 w-full h-full ${canvases.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {canvases.map((canvas) => (
        <div
          key={canvas.id}
          className="relative min-w-0 min-h-0 group cursor-pointer rounded-lg transition-shadow hover:shadow-lg hover:shadow-accent-500/10"
          onClick={() => setFocusedId(canvas.id)}
        >
          <Canvas content={canvas} />
          {/* Zoom overlay on hover */}
          <div className="absolute inset-0 rounded-lg bg-surface-900/0 group-hover:bg-surface-900/30 transition-colors flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-surface-800/80 backdrop-blur-sm border border-surface-600/50">
              <Icon name="zoomIn" size={18} strokeWidth={2} className="text-surface-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
