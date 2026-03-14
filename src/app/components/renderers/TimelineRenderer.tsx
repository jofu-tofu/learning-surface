import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import { computeSvgFitStyle } from './diagram-layout.js';
import {
  parseTimelineData,
  computeTimelineLayout,
  TIMELINE_CONSTANTS,
} from './timeline-layout.js';

const { EVENT_RADIUS, LABEL_OFFSET, DATE_OFFSET } = TIMELINE_CONSTANTS;

export function TimelineRenderer({ content, containerWidth, containerHeight }: RendererProps): React.ReactElement {
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prevContentRef = useRef(content);

  useEffect(() => {
    if (content !== prevContentRef.current) {
      setMounted(false);
      prevContentRef.current = content;
    }
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, [content]);

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
                transition: `opacity 0.4s ease ${i * 0.08}s`,
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
                <foreignObject
                  x={isHorizontal ? event.x - 100 : event.x + LABEL_OFFSET}
                  y={isHorizontal ? event.y + LABEL_OFFSET + 12 : event.y + 16}
                  width={200}
                  height={80}
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      background: 'var(--color-surface-900)',
                      border: '1px solid var(--color-surface-600)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                      color: 'var(--color-surface-200)',
                      maxWidth: '200px',
                    }}
                  >
                    {event.description}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
