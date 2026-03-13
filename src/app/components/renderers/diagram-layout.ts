import {
  edgeLabelRect,
  resolveEdgeLabelOverlaps,
  routeCrossLayerEdges,
} from './overlap-resolution.js';

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

// --- Layout Constants ---

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 44;
export const HORIZONTAL_GAP = 48;
export const VERTICAL_GAP = 64;
export const DIAGRAM_PADDING = 32;
export const GROUP_PADDING = 12;

// --- Shape Constants ---

export const SHAPE_INSET = 1;
export const RECT_CORNER_RADIUS = 4;
export const ROUNDED_CORNER_RADIUS = 12;
export const SHAPE_STROKE_WIDTH = 1.5;

// --- Edge Label Constants ---

export const EDGE_LABEL_CHAR_WIDTH = 7;
export const EDGE_LABEL_PADDING = 16;
export const EDGE_LABEL_HEIGHT = 20;
export const EDGE_LABEL_PILL_RADIUS = 10;
export const EDGE_LABEL_TEXT_OFFSET_Y = 4;
export const EDGE_LABEL_FONT_SIZE = 11;

// --- Node Content Constants ---

export const CATEGORY_DOT_X = 12;
export const CATEGORY_DOT_RADIUS = 3.5;
export const CATEGORY_TEXT_OFFSET = 4;
export const NODE_LABEL_FONT_SIZE = 13;
export const INFO_ICON_MARGIN = 12;
export const INFO_ICON_RADIUS = 5;
export const INFO_ICON_FONT_SIZE = 8;

// --- Arrow Marker Constants ---

export const ARROW_VIEWBOX = '0 0 10 8';
export const ARROW_REF_X = 9;
export const ARROW_REF_Y = 4;
export const ARROW_WIDTH = 8;
export const ARROW_HEIGHT = 6;
export const ARROW_PATH = 'M 0 0 L 10 4 L 0 8 Z';

// --- Group Rendering Constants ---

export const GROUP_LABEL_OFFSET_X = 8;
export const GROUP_LABEL_OFFSET_Y = 14;
export const GROUP_LABEL_FONT_SIZE = 10;
export const GROUP_RECT_DASH = '6 3';

// --- Tooltip Constants ---

export const TOOLTIP_MAX_WIDTH = 200;
export const TOOLTIP_EDGE_PADDING = 4;
export const TOOLTIP_Y_OFFSET = 8;
export const TOOLTIP_FO_HEIGHT = 100;

// --- Animation Constants ---

export const ANIMATION_DURATION = 0.4;
export const NODE_STAGGER_DELAY = 0.05;
export const EDGE_BASE_DELAY = 0.1;
export const EDGE_STAGGER_DELAY = 0.03;
export const DIMMED_OPACITY = 0.4;

// --- Bezier Curve Constants ---

export const BEZIER_CONTROL_FACTOR = 0.4;
export const BEZIER_CONTROL_MIN = 20;
export const REROUTE_LABEL_WEIGHT_ENDPOINT = 0.125;
export const REROUTE_LABEL_WEIGHT_ROUTE = 0.75;

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

// --- Pure Render Helpers ---

export type NodeShape = 'rectangle' | 'rounded' | 'diamond' | 'circle';

/** Corner radius for a given node shape. */
export function shapeCornerRadius(shape: NodeShape): number {
  return shape === 'rectangle' ? RECT_CORNER_RADIUS : ROUNDED_CORNER_RADIUS;
}

/** SVG points string for a diamond polygon. */
export function diamondPoints(width: number, height: number, inset = SHAPE_INSET): string {
  return `${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`;
}

/** Ellipse geometry for a circle node. */
export function ellipseGeometry(width: number, height: number, inset = SHAPE_INSET): {
  cx: number; cy: number; rx: number; ry: number;
} {
  return {
    cx: width / 2,
    cy: height / 2,
    rx: width / 2 - inset,
    ry: height / 2 - inset,
  };
}

/** Expand a rect outward for highlight/hover glow, computing the correct rx from shape. */
export function computeGlowRect(
  nodeWidth: number, nodeHeight: number, shape: NodeShape, padding: number,
): { x: number; y: number; width: number; height: number; rx: number } {
  return {
    x: -padding,
    y: -padding,
    width: nodeWidth + 2 * padding,
    height: nodeHeight + 2 * padding,
    rx: shapeCornerRadius(shape) + padding,
  };
}

/** Clamp tooltip x so it stays within SVG bounds; offset y above target. */
export function computeTooltipPosition(
  x: number, y: number, svgWidth: number,
  maxWidth = TOOLTIP_MAX_WIDTH, edgePad = TOOLTIP_EDGE_PADDING, yOffset = TOOLTIP_Y_OFFSET,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x - maxWidth / 2, edgePad), svgWidth - maxWidth - edgePad),
    y: y - yOffset,
  };
}

/** Determine CSS style to fit an SVG within a container, preserving aspect ratio. */
export function computeSvgFitStyle(
  diagramWidth: number, diagramHeight: number,
  containerWidth: number | undefined, containerHeight: number | undefined,
): { width: string; height: string; maxWidth?: string } {
  const cw = containerWidth ?? 0;
  const ch = containerHeight ?? 0;
  if (cw > 0 && ch > 0) {
    const diagramAspect = diagramWidth / diagramHeight;
    const containerAspect = cw / ch;
    if (diagramAspect > containerAspect) {
      return { width: '100%', height: 'auto' };
    }
    return { width: 'auto', height: '100%', maxWidth: '100%' };
  }
  return { width: '100%', height: 'auto' };
}

/** Staggered opacity transition string for node entry animation. */
export function nodeTransition(index: number): string {
  return `opacity ${ANIMATION_DURATION}s ease ${index * NODE_STAGGER_DELAY}s`;
}

/** Staggered opacity transition string for edge entry animation. */
export function edgeTransition(index: number): string {
  return `opacity ${ANIMATION_DURATION}s ease ${EDGE_BASE_DELAY + index * EDGE_STAGGER_DELAY}s`;
}

/** Node opacity based on mount state and emphasis. */
export function nodeOpacity(mounted: boolean, emphasis: NodeEmphasis | undefined): number {
  if (!mounted) return 0;
  return (emphasis ?? 'normal') === 'dimmed' ? DIMMED_OPACITY : 1;
}

/** X position for the node label text, shifted when a category dot is present. */
export function nodeLabelX(nodeWidth: number, hasCategory: boolean): number {
  return nodeWidth / 2 + (hasCategory ? CATEGORY_TEXT_OFFSET : 0);
}

/** Compute Bezier control point offset from distance between endpoints. */
export function controlPointOffset(distance: number): number {
  return Math.max(Math.abs(distance) * BEZIER_CONTROL_FACTOR, BEZIER_CONTROL_MIN);
}

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

  // Build layer lookup for cross-layer detection
  const layerMap = new Map<string, number>();
  for (let i = 0; i < layers.length; i++) {
    for (const nodeId of layers[i]) {
      layerMap.set(nodeId, i);
    }
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
      const cpOff = controlPointOffset(dx);
      const path = `M ${startX} ${startY} C ${startX + cpOff} ${startY}, ${endX - cpOff} ${endY}, ${endX} ${endY}`;
      positionedEdges.push({ ...edge, path, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2 });
    } else {
      // Exit from bottom, enter from top
      startX = from.x + NODE_WIDTH / 2;
      startY = from.y + NODE_HEIGHT;
      endX = to.x + NODE_WIDTH / 2;
      endY = to.y;
      const dy = endY - startY;
      const cpOff = controlPointOffset(dy);
      const path = `M ${startX} ${startY} C ${startX} ${startY + cpOff}, ${endX} ${endY - cpOff}, ${endX} ${endY}`;
      positionedEdges.push({ ...edge, path, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2 });
    }
  }

  // --- Overlap resolution ---
  // 1. Reroute cross-layer edges around intermediate nodes
  routeCrossLayerEdges(positionedEdges, positionedNodes, layerMap, posMap, isLR, totalWidth, totalHeight);
  // 2. Shift edge labels away from nodes and each other
  resolveEdgeLabelOverlaps(positionedEdges, positionedNodes);

  // Expand bounds if rerouted edges or shifted labels extend beyond original area
  let finalWidth = totalWidth;
  let finalHeight = totalHeight;
  for (const edge of positionedEdges) {
    if (!edge.label) continue;
    const r = edgeLabelRect(edge.label, edge.labelX, edge.labelY);
    finalWidth = Math.max(finalWidth, r.x + r.width + DIAGRAM_PADDING);
    finalHeight = Math.max(finalHeight, r.y + r.height + DIAGRAM_PADDING);
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

  return { nodes: positionedNodes, edges: positionedEdges, groups, width: finalWidth, height: finalHeight };
}
