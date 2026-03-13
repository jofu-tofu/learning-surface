// --- Data Shape ---

export type NodeCategory = 'input' | 'process' | 'output' | 'decision' | 'concept' | 'warning';
export type NodeEmphasis = 'normal' | 'highlighted' | 'dimmed';

export interface DiagramNode {
  id: string;
  label: string;
  shape?: 'rectangle' | 'rounded' | 'diamond' | 'circle';
  category?: NodeCategory;
  description?: string;
  emphasis?: NodeEmphasis;
  group?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: 'TB' | 'LR';
}

// --- Constants ---

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 44;
export const HORIZONTAL_GAP = 48;
export const VERTICAL_GAP = 64;
export const DIAGRAM_PADDING = 32;
export const GROUP_PADDING = 12;

// --- Category Color Palette ---

export const CATEGORY_COLORS: Record<NodeCategory, { fill: string; stroke: string; text: string }> = {
  input:    { fill: '#1e3a5f', stroke: '#3b82f6', text: '#93c5fd' },
  process:  { fill: '#14532d', stroke: '#22c55e', text: '#86efac' },
  output:   { fill: '#431407', stroke: '#f97316', text: '#fdba74' },
  decision: { fill: '#422006', stroke: '#eab308', text: '#fde047' },
  concept:  { fill: '#2e1065', stroke: '#a855f7', text: '#d8b4fe' },
  warning:  { fill: '#450a0a', stroke: '#ef4444', text: '#fca5a5' },
};

export const DEFAULT_COLORS = {
  fill: 'var(--color-surface-800)',
  stroke: 'var(--color-surface-600)',
  text: 'var(--color-surface-100)',
};

// --- Parsing ---

export function parseDiagramData(content: string): DiagramData | null {
  try {
    const parsedData = JSON.parse(content);
    if (!Array.isArray(parsedData.nodes) || !Array.isArray(parsedData.edges)) return null;
    for (const node of parsedData.nodes) {
      if (typeof node.id !== 'string' || typeof node.label !== 'string') return null;
    }
    for (const edge of parsedData.edges) {
      if (typeof edge.from !== 'string' || typeof edge.to !== 'string') return null;
    }
    return parsedData as DiagramData;
  } catch {
    return null;
  }
}

// --- Layout ---

export interface PositionedNode extends DiagramNode {
  x: number;
  y: number;
}

export interface PositionedEdge extends DiagramEdge {
  path: string;
  labelX: number;
  labelY: number;
}

export interface GroupRect {
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeDiagramLayout(data: DiagramData): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  groups: GroupRect[];
  width: number;
  height: number;
} {
  const { nodes, edges, direction = 'TB' } = data;
  if (nodes.length === 0) return { nodes: [], edges: [], groups: [], width: 0, height: 0 };

  const isLR = direction === 'LR';

  // Build incoming-edge map
  const incoming = new Map<string, Set<string>>();
  const nodeIds = new Set(nodes.map(node => node.id));
  for (const node of nodes) incoming.set(node.id, new Set());
  for (const edge of edges) {
    if (nodeIds.has(edge.to) && nodeIds.has(edge.from)) {
      incoming.get(edge.to)!.add(edge.from);
    }
  }

  // Assign layers via topological sort
  const layers: string[][] = [];
  const assigned = new Set<string>();

  while (assigned.size < nodes.length) {
    const batch = nodes
      .filter(node => !assigned.has(node.id))
      .filter(node => {
        const preds = incoming.get(node.id) ?? new Set();
        return [...preds].every(p => assigned.has(p) || !nodeIds.has(p));
      })
      .map(node => node.id);

    if (batch.length === 0) {
      // Cycle: add all remaining
      const remaining = nodes.filter(node => !assigned.has(node.id)).map(node => node.id);
      layers.push(remaining);
      remaining.forEach(id => assigned.add(id));
      break;
    }

    layers.push(batch);
    batch.forEach(id => assigned.add(id));
  }

  // Position nodes
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const posMap = new Map<string, { x: number; y: number }>();

  // For TB: layers are rows (x varies within layer, y varies across layers)
  // For LR: layers are columns (y varies within layer, x varies across layers)
  const maxLayerSize = Math.max(...layers.map(layer => layer.length));

  let totalWidth: number;
  let totalHeight: number;

  if (isLR) {
    const layerWidth = layers.length * NODE_WIDTH + (layers.length - 1) * HORIZONTAL_GAP + 2 * DIAGRAM_PADDING;
    const maxColumnHeight = maxLayerSize * NODE_HEIGHT + (maxLayerSize - 1) * VERTICAL_GAP + 2 * DIAGRAM_PADDING;
    totalWidth = Math.max(layerWidth, NODE_WIDTH + 2 * DIAGRAM_PADDING);
    totalHeight = Math.max(maxColumnHeight, NODE_HEIGHT + 2 * DIAGRAM_PADDING);
  } else {
    const rowWidth = Math.max(maxLayerSize * NODE_WIDTH + (maxLayerSize - 1) * HORIZONTAL_GAP + 2 * DIAGRAM_PADDING, NODE_WIDTH + 2 * DIAGRAM_PADDING);
    const colHeight = DIAGRAM_PADDING + layers.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP + DIAGRAM_PADDING;
    totalWidth = rowWidth;
    totalHeight = colHeight;
  }

  const positionedNodes: PositionedNode[] = [];

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];

    if (isLR) {
      const x = DIAGRAM_PADDING + layerIndex * (NODE_WIDTH + HORIZONTAL_GAP);
      const layerHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * VERTICAL_GAP;
      const startY = (totalHeight - layerHeight) / 2;
      for (let nodeIndex = 0; nodeIndex < layer.length; nodeIndex++) {
        const y = startY + nodeIndex * (NODE_HEIGHT + VERTICAL_GAP);
        const node = nodeMap.get(layer[nodeIndex])!;
        posMap.set(node.id, { x, y });
        positionedNodes.push({ ...node, x, y });
      }
    } else {
      const layerWidth = layer.length * NODE_WIDTH + (layer.length - 1) * HORIZONTAL_GAP;
      const startX = (totalWidth - layerWidth) / 2;
      const y = DIAGRAM_PADDING + layerIndex * (NODE_HEIGHT + VERTICAL_GAP);
      for (let nodeIndex = 0; nodeIndex < layer.length; nodeIndex++) {
        const x = startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP);
        const node = nodeMap.get(layer[nodeIndex])!;
        posMap.set(node.id, { x, y });
        positionedNodes.push({ ...node, x, y });
      }
    }
  }

  // Compute edge paths
  const positionedEdges: PositionedEdge[] = [];
  for (const edge of edges) {
    const from = posMap.get(edge.from);
    const to = posMap.get(edge.to);
    if (!from || !to) continue;

    let startX: number, startY: number, endX: number, endY: number;

    if (isLR) {
      // Exit from right side, enter from left side
      startX = from.x + NODE_WIDTH;
      startY = from.y + NODE_HEIGHT / 2;
      endX = to.x;
      endY = to.y + NODE_HEIGHT / 2;
      const dx = endX - startX;
      const controlPointOffset = Math.max(Math.abs(dx) * 0.4, 20);
      const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
      positionedEdges.push({ ...edge, path, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2 });
    } else {
      // Exit from bottom, enter from top
      startX = from.x + NODE_WIDTH / 2;
      startY = from.y + NODE_HEIGHT;
      endX = to.x + NODE_WIDTH / 2;
      endY = to.y;
      const dy = endY - startY;
      const controlPointOffset = Math.max(Math.abs(dy) * 0.4, 20);
      const path = `M ${startX} ${startY} C ${startX} ${startY + controlPointOffset}, ${endX} ${endY - controlPointOffset}, ${endX} ${endY}`;
      positionedEdges.push({ ...edge, path, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2 });
    }
  }

  // Compute group rects
  const groupMap = new Map<string, PositionedNode[]>();
  for (const node of positionedNodes) {
    if (node.group) {
      const list = groupMap.get(node.group) ?? [];
      list.push(node);
      groupMap.set(node.group, list);
    }
  }

  const groups: GroupRect[] = [];
  for (const [group, groupNodes] of groupMap) {
    if (groupNodes.length < 2) continue; // don't draw a group box around a single node
    const minX = Math.min(...groupNodes.map(node => node.x)) - GROUP_PADDING;
    const minY = Math.min(...groupNodes.map(node => node.y)) - GROUP_PADDING;
    const maxX = Math.max(...groupNodes.map(node => node.x + NODE_WIDTH)) + GROUP_PADDING;
    const maxY = Math.max(...groupNodes.map(node => node.y + NODE_HEIGHT)) + GROUP_PADDING;
    groups.push({ group, x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }

  return { nodes: positionedNodes, edges: positionedEdges, groups, width: totalWidth, height: totalHeight };
}
