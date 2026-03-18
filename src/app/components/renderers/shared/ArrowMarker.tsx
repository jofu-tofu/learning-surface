import React from 'react';
import {
  ARROW_VIEWBOX,
  ARROW_REF_X,
  ARROW_REF_Y,
  ARROW_WIDTH,
  ARROW_HEIGHT,
  ARROW_PATH,
} from '../diagram-constants.js';

interface ArrowMarkerProps {
  id: string;
  color?: string;
  opacity?: number;
}

/** Reusable SVG arrow marker for diagram and sequence renderers. */
export function ArrowMarker({ id, color = 'var(--color-accent-400)', opacity }: ArrowMarkerProps) {
  return (
    <marker
      id={id}
      viewBox={ARROW_VIEWBOX}
      refX={ARROW_REF_X}
      refY={ARROW_REF_Y}
      markerWidth={ARROW_WIDTH}
      markerHeight={ARROW_HEIGHT}
      orient="auto-start-reverse"
    >
      <path d={ARROW_PATH} fill={color} fillOpacity={opacity} />
    </marker>
  );
}
