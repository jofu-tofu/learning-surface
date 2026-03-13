import React, { useId, useMemo, useState, useEffect, useRef } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import {
  parseDiagramData,
  computeDiagramLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  CATEGORY_COLORS,
  DEFAULT_COLORS,
  type PositionedNode,
} from './diagram-layout.js';

export { parseDiagramData, computeDiagramLayout } from './diagram-layout.js';

// --- Node Shape Rendering ---

function NodeShape({ shape, width, height, fill, stroke }: {
  shape: string; width: number; height: number; fill: string; stroke: string;
}): React.ReactElement {
  switch (shape) {
    case 'diamond':
      return (
        <polygon
          points={`${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    case 'circle':
      return (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - 1}
          ry={height / 2 - 1}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    case 'rectangle':
      return (
        <rect
          width={width}
          height={height}
          rx={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    default: // rounded
      return (
        <rect
          width={width}
          height={height}
          rx={12}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
  }
}

// --- Tooltip Component ---

function Tooltip({ text, x, y, svgWidth }: {
  text: string; x: number; y: number; svgWidth: number;
}): React.ReactElement {
  const maxWidth = 200;
  const tooltipX = Math.min(Math.max(x - maxWidth / 2, 4), svgWidth - maxWidth - 4);
  const tooltipY = y - 8;

  return (
    <foreignObject
      x={tooltipX}
      y={tooltipY}
      width={maxWidth}
      height={100}
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
          maxWidth: `${maxWidth}px`,
          transform: 'translateY(-100%)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}

// --- Diagram Node Element ---

interface DiagramNodeProps {
  node: PositionedNode;
  index: number;
  mounted: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

function DiagramNodeElement({ node, index, mounted, isHovered, onHover }: DiagramNodeProps): React.ReactElement {
  const colors = node.category ? CATEGORY_COLORS[node.category] : DEFAULT_COLORS;
  const emphasis = node.emphasis ?? 'normal';
  const isHighlighted = emphasis === 'highlighted';
  const isDimmed = emphasis === 'dimmed';

  return (
    <g
      key={node.id}
      transform={`translate(${node.x}, ${node.y})`}
      style={{
        opacity: mounted ? (isDimmed ? 0.4 : 1) : 0,
        transform: `translate(${node.x}px, ${node.y}px)`,
        transition: `opacity 0.4s ease ${index * 0.05}s`,
        cursor: node.description ? 'pointer' : 'default',
      }}
      onMouseEnter={node.description ? () => onHover(node.id) : undefined}
      onMouseLeave={node.description ? () => onHover(null) : undefined}
    >
      {/* Highlight glow for emphasized nodes */}
      {isHighlighted && (
        <rect
          x={-3}
          y={-3}
          width={NODE_WIDTH + 6}
          height={NODE_HEIGHT + 6}
          rx={node.shape === 'rectangle' ? 7 : 15}
          fill="none"
          stroke={colors.stroke}
          strokeOpacity={0.4}
          strokeWidth={2}
        />
      )}

      {/* Hover highlight */}
      {isHovered && (
        <rect
          x={-2}
          y={-2}
          width={NODE_WIDTH + 4}
          height={NODE_HEIGHT + 4}
          rx={node.shape === 'rectangle' ? 6 : 14}
          fill="none"
          stroke={colors.stroke}
          strokeOpacity={0.6}
          strokeWidth={1.5}
        />
      )}

      <NodeShape
        shape={node.shape ?? 'rounded'}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        fill={colors.fill}
        stroke={colors.stroke}
      />

      {/* Category indicator dot */}
      {node.category && (
        <circle
          cx={12}
          cy={NODE_HEIGHT / 2}
          r={3.5}
          fill={colors.stroke}
          fillOpacity={0.8}
        />
      )}

      <text
        x={NODE_WIDTH / 2 + (node.category ? 4 : 0)}
        y={NODE_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={13}
        fontFamily="var(--font-sans)"
        fontWeight={500}
      >
        {node.label}
      </text>

      {/* Description indicator icon */}
      {node.description && !isHovered && (
        <g>
          <circle
            cx={NODE_WIDTH - 12}
            cy={12}
            r={5}
            fill="none"
            stroke={colors.text}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <text
            x={NODE_WIDTH - 12}
            y={13}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fillOpacity={0.3}
            fontSize={8}
            fontFamily="var(--font-sans)"
            fontWeight={600}
          >
            i
          </text>
        </g>
      )}
    </g>
  );
}

// --- Component ---

export function DiagramRenderer({ content }: RendererProps): React.ReactElement {
  const reactId = useId();
  const markerId = reactId.replace(/:/g, '');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevContentRef = useRef(content);

  // Trigger entry animation on mount and content change
  useEffect(() => {
    if (content !== prevContentRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset animation state on content change
      setMounted(false);
      prevContentRef.current = content;
    }
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, [content]);

  const data = useMemo(() => parseDiagramData(content), [content]);
  const layout = useMemo(() => data ? computeDiagramLayout(data) : null, [data]);

  if (!data || !layout) {
    return <ErrorBanner message="Invalid diagram data — expected JSON with nodes and edges arrays" />;
  }

  if (layout.nodes.length === 0) {
    return <div className="text-sm text-surface-400">Empty diagram</div>;
  }

  const hoveredNode = hoveredNodeId ? layout.nodes.find(n => n.id === hoveredNodeId) : null;

  return (
    <div data-testid="canvas-diagram" className="canvas-container flex justify-center">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto"
        style={{ maxHeight: '500px' }}
      >
        <defs>
          <marker
            id={`dg-arrow-${markerId}`}
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 4 L 0 8 Z"
              fill="var(--color-accent-400)"
              fillOpacity={0.7}
            />
          </marker>
        </defs>

        {/* Group background regions */}
        {layout.groups.map((groupRect) => (
          <rect
            key={`group-${groupRect.group}`}
            x={groupRect.x}
            y={groupRect.y}
            width={groupRect.width}
            height={groupRect.height}
            rx={12}
            fill="var(--color-surface-800)"
            fillOpacity={0.3}
            stroke="var(--color-surface-600)"
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="6 3"
          />
        ))}

        {/* Group labels */}
        {layout.groups.map((groupRect) => (
          <text
            key={`group-label-${groupRect.group}`}
            x={groupRect.x + 8}
            y={groupRect.y + 14}
            fill="var(--color-surface-500)"
            fontSize={10}
            fontFamily="var(--font-sans)"
            fontWeight={500}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {groupRect.group}
          </text>
        ))}

        {/* Edges (behind nodes) */}
        {layout.edges.map((e, i) => (
          <g
            key={`edge-${i}`}
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 0.4s ease ${0.1 + i * 0.03}s`,
            }}
          >
            <path
              d={e.path}
              fill="none"
              stroke="var(--color-accent-400)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              markerEnd={`url(#dg-arrow-${markerId})`}
            />
            {e.label && (
              <>
                {/* Background pill for edge label */}
                <rect
                  x={e.labelX - (e.label.length * 3.5 + 8)}
                  y={e.labelY - 16}
                  width={e.label.length * 7 + 16}
                  height={20}
                  rx={10}
                  fill="var(--color-surface-900)"
                  fillOpacity={0.85}
                  stroke="var(--color-accent-400)"
                  strokeOpacity={0.3}
                  strokeWidth={0.75}
                />
                <text
                  x={e.labelX}
                  y={e.labelY - 4}
                  textAnchor="middle"
                  fill="var(--color-accent-400)"
                  fillOpacity={0.85}
                  fontSize={11}
                  fontFamily="var(--font-sans)"
                  fontWeight={500}
                >
                  {e.label}
                </text>
              </>
            )}
          </g>
        ))}

        {/* Nodes */}
        {layout.nodes.map((node, i) => (
          <DiagramNodeElement
            key={node.id}
            node={node}
            index={i}
            mounted={mounted}
            isHovered={hoveredNodeId === node.id}
            onHover={setHoveredNodeId}
          />
        ))}

        {/* Tooltip for hovered node */}
        {hoveredNode?.description && (
          <Tooltip
            text={hoveredNode.description}
            x={hoveredNode.x + NODE_WIDTH / 2}
            y={hoveredNode.y}
            svgWidth={layout.width}
          />
        )}
      </svg>
    </div>
  );
}
