import React, { useMemo, useState } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import { computeSvgFitStyle, staggerTransition } from './shared/svg-utils.js';
import {
  parseTimelineData,
  computeTimelineLayout,
  TIMELINE_CONSTANTS,
} from './timeline-layout.js';
import { useMountAnimation } from '../../hooks/useMountAnimation.js';
import { SvgTooltip } from './shared/SvgTooltip.js';

const { EVENT_RADIUS, LABEL_OFFSET, DATE_OFFSET } = TIMELINE_CONSTANTS;

export function TimelineRenderer({ content, containerWidth, containerHeight }: RendererProps): React.ReactElement {
  const mounted = useMountAnimation(content);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const data = useMemo(() => parseTimelineData(content), [content]);
  const layout = useMemo(() => data ? computeTimelineLayout(data) : null, [data]);

  if (!data || !layout) {
    return <ErrorBanner message="Invalid timeline data — expected JSON with events array" />;
  }

  if (layout.events.length === 0) {
    return <div className="text-sm text-surface-400">Empty timeline</div>;
  }

  const isHorizontal = layout.direction === 'horizontal';
  const svgStyle = computeSvgFitStyle(layout.width, layout.height, containerWidth, containerHeight);

  return (
    <div data-testid="canvas-timeline" className="canvas-container flex items-center justify-center w-full h-full">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
      >
        {/* Axis line */}
        <line
          x1={layout.axisStart.x}
          y1={layout.axisStart.y}
          x2={layout.axisEnd.x}
          y2={layout.axisEnd.y}
          stroke="var(--color-surface-600)"
          strokeWidth={2}
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Events */}
        {layout.events.map((event, i) => {
          const isHovered = hoveredId === event.id;
          return (
            <g
              key={event.id}
              style={{
                opacity: mounted ? 1 : 0,
                transition: staggerTransition(i, 0.4, 0.08),
                cursor: event.description ? 'pointer' : 'default',
              }}
              onMouseEnter={event.description ? () => setHoveredId(event.id) : undefined}
              onMouseLeave={event.description ? () => setHoveredId(null) : undefined}
            >
              {/* Event dot */}
              <circle
                cx={event.x}
                cy={event.y}
                r={isHovered ? EVENT_RADIUS + 2 : EVENT_RADIUS}
                fill={event.color}
                stroke="var(--color-surface-900)"
                strokeWidth={2}
                style={{ transition: 'r 0.15s ease' }}
              />

              {isHorizontal ? (
                <>
                  {/* Date above */}
                  <text
                    x={event.x}
                    y={event.y - DATE_OFFSET}
                    textAnchor="middle"
                    fill="var(--color-surface-400)"
                    fontSize={11}
                    fontFamily="var(--font-sans)"
                  >
                    {event.date}
                  </text>
                  {/* Label below */}
                  <text
                    x={event.x}
                    y={event.y + LABEL_OFFSET}
                    textAnchor="middle"
                    fill="var(--color-surface-100)"
                    fontSize={12}
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                  >
                    {event.label}
                  </text>
                </>
              ) : (
                <>
                  {/* Date to the left */}
                  <text
                    x={event.x - DATE_OFFSET}
                    y={event.y + 4}
                    textAnchor="end"
                    fill="var(--color-surface-400)"
                    fontSize={11}
                    fontFamily="var(--font-sans)"
                  >
                    {event.date}
                  </text>
                  {/* Label to the right */}
                  <text
                    x={event.x + LABEL_OFFSET}
                    y={event.y + 4}
                    textAnchor="start"
                    fill="var(--color-surface-100)"
                    fontSize={12}
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                  >
                    {event.label}
                  </text>
                </>
              )}

              {/* Tooltip on hover */}
              {isHovered && event.description && (
                <SvgTooltip
                  text={event.description}
                  x={event.x}
                  y={isHorizontal ? event.y + LABEL_OFFSET + 12 : event.y + 16}
                  svgWidth={layout.width}
                  placement="below"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
