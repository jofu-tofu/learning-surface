import React, { useState, useEffect } from 'react';
import type { LearningDocument } from '../../shared/document.js';
import { CanvasGrid } from './CanvasGrid.js';
import { BlockStream } from './BlockStream.js';
import { Pane } from './Pane.js';
import { IconButton } from './IconButton.js';
import { Icon } from './Icon.js';
import { FullscreenOverlay } from './FullscreenOverlay.js';
import { useResizablePane } from '../hooks/useResizablePane.js';

interface PaneLayoutProps {
  document: LearningDocument | null;
  onSubmitResponses: (responses: Record<string, string>) => void;
  onSuggestionClick: (text: string) => void;
  paneScrollRefs: Record<string, React.RefObject<HTMLDivElement | null>>;
}

export function PaneLayout({ document: doc, onSubmitResponses, onSuggestionClick, paneScrollRefs }: PaneLayoutProps): React.ReactElement {
  const { splitPercent, isDragging, containerRef, startDrag } = useResizablePane({ initialSplit: 50, minPercent: 20 });
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [blocksFullscreen, setBlocksFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasFullscreen && !blocksFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCanvasFullscreen(false);
        setBlocksFullscreen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canvasFullscreen, blocksFullscreen]);

  const canvases = doc?.canvases ?? [];
  const blocks = doc?.blocks ?? [];

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
            <CanvasGrid canvases={canvases} />
          </div>
        </Pane>

        {/* Resize handle */}
        <div
          className={`resize-handle ${isDragging ? 'dragging' : ''}`}
          onPointerDown={startDrag}
        >
          <Icon name="gripVertical" size={12} strokeWidth={0} className="resize-grip" />
        </div>

        {/* Blocks pane */}
        <Pane
          id="blocks"
          title="Blocks"
          className="flex-1"
          scrollRef={paneScrollRefs['blocks']}
          actions={
            <IconButton
              icon="maximize"
              title="Expand blocks to fullscreen"
              onClick={() => setBlocksFullscreen(true)}
            />
          }
        >
          <BlockStream
            blocks={blocks}
            onSubmitResponses={onSubmitResponses}
            onSuggestionClick={onSuggestionClick}
          />
        </Pane>
      </div>

      {/* Canvas fullscreen overlay */}
      {canvasFullscreen && (
        <FullscreenOverlay title="Canvas" onClose={() => setCanvasFullscreen(false)}>
          <div className="canvas-fullscreen-body">
            <CanvasGrid canvases={canvases} />
          </div>
        </FullscreenOverlay>
      )}

      {/* Blocks fullscreen overlay */}
      {blocksFullscreen && (
        <FullscreenOverlay title="Blocks" onClose={() => setBlocksFullscreen(false)}>
          <div className="flex-1 overflow-auto p-6">
            <BlockStream
              blocks={blocks}
              onSubmitResponses={onSubmitResponses}
              onSuggestionClick={onSuggestionClick}
            />
          </div>
        </FullscreenOverlay>
      )}
    </>
  );
}
