import React, { useState, useEffect } from 'react';
import type { Section } from '../../shared/types.js';
import { CanvasGrid } from './CanvasGrid.js';
import { Explanation } from './Explanation.js';
import { Pane } from './Pane.js';
import { IconButton } from './IconButton.js';
import { Icon } from './Icon.js';
import { FullscreenOverlay } from './FullscreenOverlay.js';
import { useResizablePane } from '../hooks/useResizablePane.js';
import type { SecondPaneEntry } from './panes/registry.js';

interface PaneLayoutProps {
  activeSection: Section | undefined;
  activePhase: string;
  secondPane: SecondPaneEntry;
  paneScrollRefs: Record<string, React.RefObject<HTMLDivElement | null>>;
}

export function PaneLayout({ activeSection, activePhase, secondPane, paneScrollRefs }: PaneLayoutProps): React.ReactElement {
  const { splitPercent, isDragging, containerRef, startDrag } = useResizablePane({ initialSplit: 50, minPercent: 20 });
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [explanationFullscreen, setExplanationFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasFullscreen && !explanationFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCanvasFullscreen(false);
        setExplanationFullscreen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canvasFullscreen, explanationFullscreen]);

  return (
    <>
      <div ref={containerRef} className="flex-1 flex min-h-0">
        {/* Canvas pane */}
        <Pane
          id="canvas"
          title="Canvas"
          style={{ width: `${splitPercent}%`, flexShrink: 0, flexGrow: 0 }}
          scrollRef={paneScrollRefs['canvas']}
          actions={
            <IconButton
              icon="maximize"
              title="Expand canvas to fullscreen"
              onClick={() => setCanvasFullscreen(true)}
            />
          }
        >
          <div className="flex items-center justify-center w-full h-full">
            <CanvasGrid canvases={activeSection?.canvases ?? []} />
          </div>
        </Pane>

        {/* Resize handle */}
        <div
          className={`resize-handle ${isDragging ? 'dragging' : ''}`}
          onPointerDown={startDrag}
        >
          <Icon name="gripVertical" size={12} strokeWidth={0} className="resize-grip" />
        </div>

        {/* Second pane — Explanation or Prediction depending on phase */}
        <Pane
          id={secondPane.id}
          title={secondPane.title}
          className="flex-1"
          scrollRef={paneScrollRefs[secondPane.id]}
          actions={
            activePhase === 'explain' ? (
              <IconButton
                icon="maximize"
                title="Expand explanation to fullscreen"
                onClick={() => setExplanationFullscreen(true)}
              />
            ) : undefined
          }
        >
          <secondPane.component section={activeSection} />
        </Pane>
      </div>

      {/* Canvas fullscreen overlay */}
      {canvasFullscreen && (
        <FullscreenOverlay title="Canvas" onClose={() => setCanvasFullscreen(false)}>
          <div className="canvas-fullscreen-body">
            <CanvasGrid canvases={activeSection?.canvases ?? []} />
          </div>
        </FullscreenOverlay>
      )}

      {/* Explanation fullscreen overlay */}
      {explanationFullscreen && (
        <FullscreenOverlay title="Explanation" onClose={() => setExplanationFullscreen(false)}>
          <div className="flex-1 overflow-auto p-6">
            <Explanation section={activeSection} />
          </div>
        </FullscreenOverlay>
      )}
    </>
  );
}
