import React, { useState } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import {
  parseDiagramData,
  computeDiagramLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  CATEGORY_COLORS,
  DEFAULT_COLORS,
  SHAPE_STROKE_WIDTH,
  RECT_CORNER_RADIUS,
  ROUNDED_CORNER_RADIUS,
  EDGE_LABEL_PILL_RADIUS,
  EDGE_LABEL_TEXT_OFFSET_Y,
  EDGE_LABEL_FONT_SIZE,
  CATEGORY_DOT_X,
  CATEGORY_DOT_RADIUS,
  NODE_LABEL_FONT_SIZE,
  INFO_ICON_MARGIN,
  INFO_ICON_RADIUS,
  INFO_ICON_FONT_SIZE,
  ARROW_VIEWBOX,
  ARROW_REF_X,
  ARROW_REF_Y,
  ARROW_WIDTH,
  ARROW_HEIGHT,
  ARROW_PATH,
  GROUP_LABEL_OFFSET_X,
  GROUP_LABEL_OFFSET_Y,
  GROUP_LABEL_FONT_SIZE,
  GROUP_RECT_DASH,
  diamondPoints,
  ellipseGeometry,
  computeGlowRect,
  computeSvgFitStyle,
  nodeTransition,
  edgeTransition,
  nodeOpacity,
  nodeLabelX,
  LEADER_LINE_THRESHOLD,
  nodeLabelAvailableWidth,
  wrapLabel,
  NODE_LABEL_LINE_HEIGHT,
  type PositionedNode,
} from './diagram-layout.js';
import { edgeLabelRect } from './overlap-resolution.js';
import { useSanitizedId } from '../../hooks/useSanitizedId.js';
import { useRendererLayout } from '../../hooks/useRendererLayout.js';
import { SvgTooltip } from './shared/SvgTooltip.js';



// --- Node Shape Rendering ---

function NodeShape({ shape, width, height, fill, stroke }: {
  shape: string; width: number; height: number; fill: string; stroke: string;
}): React.ReactElement {
  switch (shape) {
    case 'diamond':
      return (
        <polygon
          points={diamondPoints(width, height)}
          fill={fill}
          stroke={stroke}
          strokeWidth={SHAPE_STROKE_WIDTH}
        />
      );
    case 'circle': {
      const ellipseParams = ellipseGeometry(width, height);
      return (
        <ellipse
          cx={ellipseParams.cx}
          cy={ellipseParams.cy}
          rx={ellipseParams.rx}
          ry={ellipseParams.ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={SHAPE_STROKE_WIDTH}
        />
      );
    }
    case 'rectangle':
      return (
        <rect
          width={width}
          height={height}
          rx={RECT_CORNER_RADIUS}
          fill={fill}
          stroke={stroke}
          strokeWidth={SHAPE_STROKE_WIDTH}
        />
      );
    default: // rounded
      return (
        <rect
          width={width}
          height={height}
          rx={ROUNDED_CORNER_RADIUS}
          fill={fill}
          stroke={stroke}
          strokeWidth={SHAPE_STROKE_WIDTH}
        />
      );
  }
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
  const shape = node.shape ?? 'rounded';
  const labelX = nodeLabelX(NODE_WIDTH, !!node.category);
  const labelLines = wrapLabel(
    node.label,
    nodeLabelAvailableWidth(!!node.category, !!node.description),
  );

  return (
    <g
      key={node.id}
      transform={`translate(${node.x}, ${node.y})`}
      style={{
        opacity: nodeOpacity(mounted, node.emphasis),
        transform: `translate(${node.x}px, ${node.y}px)`,
        transition: nodeTransition(index),
        cursor: node.description ? 'pointer' : 'default',
      }}
      onMouseEnter={node.description ? () => onHover(node.id) : undefined}
      onMouseLeave={node.description ? () => onHover(null) : undefined}
    >
      {/* Highlight glow for emphasized nodes */}
      {isHighlighted && (() => {
        const glow = computeGlowRect(NODE_WIDTH, NODE_HEIGHT, shape, 3);
        return (
          <rect
            x={glow.x}
            y={glow.y}
            width={glow.width}
            height={glow.height}
            rx={glow.rx}
            fill="none"
            stroke={colors.stroke}
            strokeOpacity={0.4}
            strokeWidth={2}
          />
        );
      })()}

      {/* Hover highlight */}
      {isHovered && (() => {
        const hover = computeGlowRect(NODE_WIDTH, NODE_HEIGHT, shape, 2);
        return (
          <rect
            x={hover.x}
            y={hover.y}
            width={hover.width}
            height={hover.height}
            rx={hover.rx}
            fill="none"
            stroke={colors.stroke}
            strokeOpacity={0.6}
            strokeWidth={SHAPE_STROKE_WIDTH}
          />
        );
      })()}

      <NodeShape
        shape={shape}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        fill={colors.fill}
        stroke={colors.stroke}
      />

      {/* Category indicator dot */}
      {node.category && (
        <circle
          cx={CATEGORY_DOT_X}
          cy={NODE_HEIGHT / 2}
          r={CATEGORY_DOT_RADIUS}
          fill={colors.stroke}
          fillOpacity={0.8}
        />
      )}

      <text
        x={labelX}
        y={NODE_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={NODE_LABEL_FONT_SIZE}
        fontFamily="var(--font-sans)"
        fontWeight={500}
      >
        {labelLines.length === 1 ? labelLines[0] : labelLines.map((line, i) => (
          <tspan
            key={i}
            x={labelX}
            dy={i === 0
              ? -((labelLines.length - 1) * NODE_LABEL_LINE_HEIGHT) / 2
              : NODE_LABEL_LINE_HEIGHT
            }
          >
            {line}
          </tspan>
        ))}
      </text>

      {/* Description indicator icon */}
      {node.description && !isHovered && (
        <g>
          <circle
            cx={NODE_WIDTH - INFO_ICON_MARGIN}
            cy={INFO_ICON_MARGIN}
            r={INFO_ICON_RADIUS}
            fill="none"
            stroke={colors.text}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <text
            x={NODE_WIDTH - INFO_ICON_MARGIN}
            y={INFO_ICON_MARGIN + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fillOpacity={0.3}
            fontSize={INFO_ICON_FONT_SIZE}
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

export function DiagramRenderer({ content, containerWidth, containerHeight }: RendererProps): React.ReactElement {
  const markerId = useSanitizedId();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const { mounted, data: diagramData, layout } = useRendererLayout(content, parseDiagramData, computeDiagramLayout);

  if (!diagramData || !layout) {
    return <ErrorBanner message="Invalid diagram data — expected JSON with nodes and edges arrays" />;
  }

  if (layout.nodes.length === 0) {
    return <div className="text-sm text-surface-400">Empty diagram</div>;
  }

  const hoveredNode = hoveredNodeId ? layout.nodes.find(node => node.id === hoveredNodeId) : null;

  const svgStyle = computeSvgFitStyle(layout.width, layout.height, containerWidth, containerHeight);

  return (
    <div
      data-testid="canvas-diagram"
      className="canvas-container flex items-center justify-center w-full h-full"
    >
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
      >
        <defs>
          <marker
            id={`dg-arrow-${markerId}`}
            viewBox={ARROW_VIEWBOX}
            refX={ARROW_REF_X}
            refY={ARROW_REF_Y}
            markerWidth={ARROW_WIDTH}
            markerHeight={ARROW_HEIGHT}
            orient="auto-start-reverse"
          >
            <path
              d={ARROW_PATH}
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
            rx={ROUNDED_CORNER_RADIUS}
            fill="var(--color-surface-800)"
            fillOpacity={0.3}
            stroke="var(--color-surface-600)"
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray={GROUP_RECT_DASH}
          />
        ))}

        {/* Group labels */}
        {layout.groups.map((groupRect) => (
          <text
            key={`group-label-${groupRect.group}`}
            x={groupRect.x + GROUP_LABEL_OFFSET_X}
            y={groupRect.y + GROUP_LABEL_OFFSET_Y}
            fill="var(--color-surface-500)"
            fontSize={GROUP_LABEL_FONT_SIZE}
            fontFamily="var(--font-sans)"
            fontWeight={500}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {groupRect.group}
          </text>
        ))}

        {/* Edges (behind nodes) */}
        {layout.edges.map((edge, edgeIndex) => {
          const dashArray = edge.edgeType === 'dashed' ? '8 4' : edge.edgeType === 'dotted' ? '2 3' : undefined;
          return (
          <g
            key={`edge-${edgeIndex}`}
            style={{
              opacity: mounted ? 1 : 0,
              transition: edgeTransition(edgeIndex),
            }}
          >
            <path
              d={edge.path}
              fill="none"
              stroke="var(--color-accent-400)"
              strokeOpacity={0.5}
              strokeWidth={SHAPE_STROKE_WIDTH}
              strokeDasharray={dashArray}
              markerEnd={`url(#dg-arrow-${markerId})`}
            />
            {edge.sourceLabel && edge.sourceLabelX != null && edge.sourceLabelY != null && (
              <text
                x={edge.sourceLabelX}
                y={edge.sourceLabelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-accent-400)"
                fillOpacity={0.7}
                fontSize={10}
                fontFamily="var(--font-sans)"
              >
                {edge.sourceLabel}
              </text>
            )}
            {edge.targetLabel && edge.targetLabelX != null && edge.targetLabelY != null && (
              <text
                x={edge.targetLabelX}
                y={edge.targetLabelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-accent-400)"
                fillOpacity={0.7}
                fontSize={10}
                fontFamily="var(--font-sans)"
              >
                {edge.targetLabel}
              </text>
            )}
            {edge.label && (() => {
              const pill = edgeLabelRect(edge.label, edge.labelX, edge.labelY);
              const displacement = Math.hypot(
                edge.labelX - edge.anchorX,
                edge.labelY - edge.anchorY,
              );
              return (
                <>
                  {/* Leader line connecting displaced label back to edge */}
                  {displacement > LEADER_LINE_THRESHOLD && (
                    <line
                      x1={edge.anchorX}
                      y1={edge.anchorY}
                      x2={edge.labelX}
                      y2={edge.labelY}
                      stroke="var(--color-accent-400)"
                      strokeOpacity={0.3}
                      strokeWidth={1}
                      strokeDasharray="3 2"
                    />
                  )}
                  {/* Background pill for edge label */}
                  <rect
                    x={pill.x}
                    y={pill.y}
                    width={pill.width}
                    height={pill.height}
                    rx={EDGE_LABEL_PILL_RADIUS}
                    fill="var(--color-surface-900)"
                    fillOpacity={0.85}
                    stroke="var(--color-accent-400)"
                    strokeOpacity={0.3}
                    strokeWidth={0.75}
                  />
                  <text
                    x={edge.labelX}
                    y={edge.labelY - EDGE_LABEL_TEXT_OFFSET_Y}
                    textAnchor="middle"
                    fill="var(--color-accent-400)"
                    fillOpacity={0.85}
                    fontSize={EDGE_LABEL_FONT_SIZE}
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                  >
                    {edge.label}
                  </text>
                </>
              );
            })()}
          </g>
          );
        })}

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
          <SvgTooltip
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
