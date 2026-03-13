import React, { useId, useMemo } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';

// --- Data Shape ---

interface DiagramNode {
  id: string;
  label: string;
  shape?: 'rectangle' | 'rounded' | 'diamond' | 'circle';
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// --- Constants ---

const NODE_W = 160;
const NODE_H = 44;
const H_GAP = 48;
const V_GAP = 64;
const PAD = 32;

// --- Parsing ---

export function parseDiagramData(content: string): DiagramData | null {
  try {
    const raw = JSON.parse(content);
    if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;
    for (const n of raw.nodes) {
      if (typeof n.id !== 'string' || typeof n.label !== 'string') return null;
    }
    for (const e of raw.edges) {
      if (typeof e.from !== 'string' || typeof e.to !== 'string') return null;
    }
    return raw as DiagramData;
  } catch {
    return null;
  }
}

// --- Layout ---

interface PositionedNode extends DiagramNode {
  x: number;
  y: number;
}

interface PositionedEdge extends DiagramEdge {
  path: string;
  labelX: number;
  labelY: number;
}

export function computeDiagramLayout(data: DiagramData): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
} {
  const { nodes, edges } = data;
  if (nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  // Build incoming-edge map
  const incoming = new Map<string, Set<string>>();
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const n of nodes) incoming.set(n.id, new Set());
  for (const e of edges) {
    if (nodeIds.has(e.to) && nodeIds.has(e.from)) {
      incoming.get(e.to)!.add(e.from);
    }
  }

  // Assign layers via topological sort
  const layers: string[][] = [];
  const assigned = new Set<string>();

  while (assigned.size < nodes.length) {
    const batch = nodes
      .filter(n => !assigned.has(n.id))
      .filter(n => {
        const preds = incoming.get(n.id) ?? new Set();
        return [...preds].every(p => assigned.has(p) || !nodeIds.has(p));
      })
      .map(n => n.id);

    if (batch.length === 0) {
      // Cycle: add all remaining
      const remaining = nodes.filter(n => !assigned.has(n.id)).map(n => n.id);
      layers.push(remaining);
      remaining.forEach(id => assigned.add(id));
      break;
    }

    layers.push(batch);
    batch.forEach(id => assigned.add(id));
  }

  // Position nodes
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const posMap = new Map<string, { x: number; y: number }>();
  const maxLayerWidth = Math.max(...layers.map(l => l.length));
  const totalWidth = Math.max(maxLayerWidth * NODE_W + (maxLayerWidth - 1) * H_GAP + 2 * PAD, NODE_W + 2 * PAD);

  const positionedNodes: PositionedNode[] = [];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const layerWidth = layer.length * NODE_W + (layer.length - 1) * H_GAP;
    const startX = (totalWidth - layerWidth) / 2;
    const y = PAD + li * (NODE_H + V_GAP);

    for (let ni = 0; ni < layer.length; ni++) {
      const x = startX + ni * (NODE_W + H_GAP);
      const node = nodeMap.get(layer[ni])!;
      posMap.set(node.id, { x, y });
      positionedNodes.push({ ...node, x, y });
    }
  }

  // Compute edge paths
  const positionedEdges: PositionedEdge[] = [];
  for (const e of edges) {
    const from = posMap.get(e.from);
    const to = posMap.get(e.to);
    if (!from || !to) continue;

    const sx = from.x + NODE_W / 2;
    const sy = from.y + NODE_H;
    const ex = to.x + NODE_W / 2;
    const ey = to.y;

    const dy = ey - sy;
    const cp = Math.max(Math.abs(dy) * 0.4, 20);
    const path = `M ${sx} ${sy} C ${sx} ${sy + cp}, ${ex} ${ey - cp}, ${ex} ${ey}`;

    positionedEdges.push({
      ...e,
      path,
      labelX: (sx + ex) / 2,
      labelY: (sy + ey) / 2,
    });
  }

  const totalHeight = PAD + layers.length * (NODE_H + V_GAP) - V_GAP + PAD;

  return { nodes: positionedNodes, edges: positionedEdges, width: totalWidth, height: totalHeight };
}

// --- Node Shape Rendering ---

function NodeShape({ shape, w, h }: { shape: string; w: number; h: number }): React.ReactElement {
  const fill = 'var(--color-surface-800)';
  const stroke = 'var(--color-surface-600)';

  switch (shape) {
    case 'diamond':
      return (
        <polygon
          points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    case 'circle':
      return (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w / 2 - 1}
          ry={h / 2 - 1}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    case 'rectangle':
      return (
        <rect
          width={w}
          height={h}
          rx={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    default: // rounded
      return (
        <rect
          width={w}
          height={h}
          rx={12}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
  }
}

// --- Component ---

export function DiagramRenderer({ content }: RendererProps): React.ReactElement {
  const rawId = useId();
  const markerId = rawId.replace(/:/g, '');

  const data = useMemo(() => parseDiagramData(content), [content]);
  const layout = useMemo(() => data ? computeDiagramLayout(data) : null, [data]);

  if (!data || !layout) {
    return <ErrorBanner message="Invalid diagram data — expected JSON with nodes and edges arrays" />;
  }

  if (layout.nodes.length === 0) {
    return <div className="text-sm text-surface-400">Empty diagram</div>;
  }

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

        {/* Edges (behind nodes) */}
        {layout.edges.map((e, i) => (
          <g key={`edge-${i}`}>
            <path
              d={e.path}
              fill="none"
              stroke="var(--color-accent-400)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              markerEnd={`url(#dg-arrow-${markerId})`}
            />
            {e.label && (
              <text
                x={e.labelX}
                y={e.labelY - 6}
                textAnchor="middle"
                fill="var(--color-surface-400)"
                fontSize={11}
                fontFamily="var(--font-sans)"
              >
                {e.label}
              </text>
            )}
          </g>
        ))}

        {/* Nodes */}
        {layout.nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <NodeShape shape={node.shape ?? 'rounded'} w={NODE_W} h={NODE_H} />
            <text
              x={NODE_W / 2}
              y={NODE_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-surface-100)"
              fontSize={13}
              fontFamily="var(--font-sans)"
              fontWeight={500}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
