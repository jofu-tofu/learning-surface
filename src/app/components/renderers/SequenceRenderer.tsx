import React, { useState } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import { computeSvgFitStyle, mountStyle, staggerTransition } from './shared/svg-utils.js';
import { parseSequenceData, computeSequenceLayout, SEQUENCE_CONSTANTS } from './sequence-layout.js';
import { useSanitizedId } from '../../hooks/useSanitizedId.js';
import { useRendererLayout } from '../../hooks/useRendererLayout.js';
import {
  ARROW_VIEWBOX,
  ARROW_REF_X,
  ARROW_REF_Y,
  ARROW_WIDTH,
  ARROW_HEIGHT,
  ARROW_PATH,
} from './diagram-constants.js';

const {
  PARTICIPANT_WIDTH,
  PARTICIPANT_HEIGHT,
  SELF_MESSAGE_WIDTH,
  GROUP_LABEL_HEIGHT,
} = SEQUENCE_CONSTANTS;

export function SequenceRenderer({ content, containerWidth, containerHeight }: RendererProps): React.ReactElement {
  const { mounted, data, layout } = useRendererLayout(content, parseSequenceData, computeSequenceLayout);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sanitizedId = useSanitizedId();
  const markerId = `seq-arrow-${sanitizedId}`;
  const markerIdDashed = `seq-arrow-dashed-${sanitizedId}`;

  if (!data || !layout) {
    return <ErrorBanner message="Invalid sequence data — expected JSON with participants and messages arrays" />;
  }

  if (layout.participants.length === 0) {
    return <div className="text-sm text-surface-400">Empty sequence</div>;
  }

  const svgStyle = computeSvgFitStyle(layout.width, layout.height, containerWidth, containerHeight);

  return (
    <div data-testid="canvas-sequence" className="canvas-container flex items-center justify-center w-full h-full">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
      >
        <defs>
          {/* Solid arrow marker */}
          <marker
            id={markerId}
            viewBox={ARROW_VIEWBOX}
            refX={ARROW_REF_X}
            refY={ARROW_REF_Y}
            markerWidth={ARROW_WIDTH}
            markerHeight={ARROW_HEIGHT}
            orient="auto-start-reverse"
          >
            <path d={ARROW_PATH} fill="var(--color-accent-400)" />
          </marker>
          {/* Dashed arrow marker (lower opacity) */}
          <marker
            id={markerIdDashed}
            viewBox={ARROW_VIEWBOX}
            refX={ARROW_REF_X}
            refY={ARROW_REF_Y}
            markerWidth={ARROW_WIDTH}
            markerHeight={ARROW_HEIGHT}
            orient="auto-start-reverse"
          >
            <path d={ARROW_PATH} fill="var(--color-accent-400)" fillOpacity={0.6} />
          </marker>
        </defs>

        {/* Group fragments (behind everything) */}
        {layout.groups.map((group, i) => (
          <g
            key={`group-${i}`}
            style={mountStyle(mounted)}
          >
            <rect
              x={group.x}
              y={group.y}
              width={group.width}
              height={group.height}
              stroke="var(--color-surface-500)"
              strokeWidth={1}
              strokeDasharray="4 3"
              fill="var(--color-surface-800)"
              fillOpacity={0.15}
              rx={6}
            />
            {/* Group label background badge */}
            <rect
              x={group.x + 1}
              y={group.y + 1}
              width={Math.min(group.label.length * 7 + 12, group.width - 2)}
              height={GROUP_LABEL_HEIGHT}
              fill="var(--color-surface-800)"
              fillOpacity={0.6}
              rx={4}
            />
            <text
              x={group.x + 8}
              y={group.y + GROUP_LABEL_HEIGHT - 5}
              fill="var(--color-surface-400)"
              fontSize={10}
              fontWeight={500}
              fontFamily="var(--font-sans)"
            >
              {group.label}
            </text>
          </g>
        ))}

        {/* Lifelines */}
        {layout.participants.map((p) => (
          <line
            key={`lifeline-${p.id}`}
            x1={p.x}
            y1={p.y + PARTICIPANT_HEIGHT}
            x2={p.x}
            y2={layout.lifelineBottom}
            stroke="var(--color-surface-600)"
            strokeWidth={1}
            strokeDasharray="6 4"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}

        {/* Participant boxes */}
        {layout.participants.map((p, i) => (
          <g
            key={`participant-${p.id}`}
            style={{
              opacity: mounted ? 1 : 0,
              transition: staggerTransition(i),
            }}
          >
            <rect
              x={p.x - PARTICIPANT_WIDTH / 2}
              y={p.y}
              width={PARTICIPANT_WIDTH}
              height={PARTICIPANT_HEIGHT}
              fill="var(--color-surface-800)"
              stroke="var(--color-accent-400)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              rx={6}
            />
            <text
              x={p.x}
              y={p.y + PARTICIPANT_HEIGHT / 2 + 4}
              fill="var(--color-surface-100)"
              fontSize={13}
              fontWeight={500}
              fontFamily="var(--font-sans)"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}

        {/* Messages */}
        {layout.messages.map((msg) => {
          const isHovered = hoveredIndex === msg.index;
          const baseDelay = layout.participants.length * 0.05;
          const isDashed = msg.type === 'dashed';
          const currentMarkerId = isDashed ? markerIdDashed : markerId;

          if (msg.isSelf) {
            // Self-message: rectangular loop going right, down 20px, then back left
            const selfHeight = 20;
            const path = [
              `M ${msg.x1},${msg.y}`,
              `L ${msg.x1 + SELF_MESSAGE_WIDTH},${msg.y}`,
              `L ${msg.x1 + SELF_MESSAGE_WIDTH},${msg.y + selfHeight}`,
              `L ${msg.x1},${msg.y + selfHeight}`,
            ].join(' ');

            return (
              <g
                key={`msg-${msg.index}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: staggerTransition(msg.index, 0.4, 0.04, baseDelay),
                }}
                onMouseEnter={() => setHoveredIndex(msg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <path
                  d={path}
                  fill="none"
                  stroke="var(--color-accent-400)"
                  strokeOpacity={isDashed ? 0.6 : (isHovered ? 1 : 0.8)}
                  strokeWidth={1.5}
                  strokeDasharray={isDashed ? '6 3' : undefined}
                  markerEnd={`url(#${currentMarkerId})`}
                />
                {msg.label && (
                  <text
                    x={msg.x1 + SELF_MESSAGE_WIDTH + 6}
                    y={msg.y + selfHeight / 2 + 3}
                    fill="var(--color-surface-200)"
                    fontSize={11}
                    fontFamily="var(--font-sans)"
                    textAnchor="start"
                  >
                    {msg.label}
                  </text>
                )}
              </g>
            );
          }

          // Normal message: horizontal arrow
          const midX = (msg.x1 + msg.x2) / 2;

          return (
            <g
              key={`msg-${msg.index}`}
              style={{
                opacity: mounted ? 1 : 0,
                transition: staggerTransition(msg.index, 0.4, 0.04, baseDelay),
              }}
              onMouseEnter={() => setHoveredIndex(msg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <line
                x1={msg.x1}
                y1={msg.y}
                x2={msg.x2}
                y2={msg.y}
                stroke="var(--color-accent-400)"
                strokeOpacity={isDashed ? 0.6 : (isHovered ? 1 : 0.8)}
                strokeWidth={1.5}
                strokeDasharray={isDashed ? '6 3' : undefined}
                markerEnd={`url(#${currentMarkerId})`}
              />
              {msg.label && (
                <text
                  x={midX}
                  y={msg.y - 8}
                  fill="var(--color-surface-200)"
                  fontSize={11}
                  fontFamily="var(--font-sans)"
                  textAnchor="middle"
                >
                  {msg.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
