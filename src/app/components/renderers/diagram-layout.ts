import {
  edgeLabelRect,
  resolveEdgeLabelOverlaps,
  routeCrossLayerEdges,
} from './overlap-resolution.js';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  HORIZONTAL_GAP,
  EDGE_LABEL_CHAR_WIDTH,
  EDGE_LABEL_PADDING,
  EDGE_LABEL_HEIGHT,
  EDGE_LABEL_TEXT_OFFSET_Y,
  BEZIER_CONTROL_FACTOR,
  BEZIER_CONTROL_MIN,
  REROUTE_LABEL_WEIGHT_ENDPOINT,
  REROUTE_LABEL_WEIGHT_ROUTE,
  FLOW_DIRECTION_BIAS,
  LABEL_SPREAD_FACTOR,
} from './diagram-constants.js';

export { NODE_WIDTH, NODE_HEIGHT, EDGE_LABEL_TEXT_OFFSET_Y } from './diagram-constants.js';

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

const VERTICAL_GAP = 64;
const DIAGRAM_PADDING = 32;
const GROUP_PADDING = 12;

// --- Shape Constants ---

const SHAPE_INSET = 1;
export const RECT_CORNER_RADIUS = 4;
export const ROUNDED_CORNER_RADIUS = 12;
export const SHAPE_STROKE_WIDTH = 1.5;

// --- Edge Label Constants ---

export const EDGE_LABEL_PILL_RADIUS = 10;
export const EDGE_LABEL_FONT_SIZE = 11;

// --- Node Content Constants ---

export const CATEGORY_DOT_X = 12;
export const CATEGORY_DOT_RADIUS = 3.5;
const CATEGORY_TEXT_OFFSET = 4;
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
const TOOLTIP_EDGE_PADDING = 4;
const TOOLTIP_Y_OFFSET = 8;
export const TOOLTIP_FO_HEIGHT = 100;

// --- Animation Constants ---

const ANIMATION_DURATION = 0.4;
const NODE_STAGGER_DELAY = 0.05;
const EDGE_BASE_DELAY = 0.1;
const EDGE_STAGGER_DELAY = 0.03;
const DIMMED_OPACITY = 0.4;

// --- Category Color Palette ---

export const CATEGORY_COLORS: Record<NodeCategory, { fill: string; stroke: string; text: string }> = {
  input:    { fill: 'var(--color-cat-input-fill)', stroke: 'var(--color-cat-input-stroke)', text: 'var(--color-cat-input-text)' },
  process:  { fill: 'var(--color-cat-process-fill)', stroke: 'var(--color-cat-process-stroke)', text: 'var(--color-cat-process-text)' },
  output:   { fill: 'var(--color-cat-output-fill)', stroke: 'var(--color-cat-output-stroke)', text: 'var(--color-cat-output-text)' },
  decision: { fill: 'var(--color-cat-decision-fill)', stroke: 'var(--color-cat-decision-stroke)', text: 'var(--color-cat-decision-text)' },
  concept:  { fill: 'var(--color-cat-concept-fill)', stroke: 'var(--color-cat-concept-stroke)', text: 'var(--color-cat-concept-text)' },
  warning:  { fill: 'var(--color-cat-warning-fill)', stroke: 'var(--color-cat-warning-stroke)', text: 'var(--color-cat-warning-text)' },
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
  const safeContainerWidth = containerWidth ?? 0;
  const safeContainerHeight = containerHeight ?? 0;
  if (safeContainerWidth > 0 && safeContainerHeight > 0) {
    const diagramAspect = diagramWidth / diagramHeight;
    const containerAspect = safeContainerWidth / safeContainerHeight;
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

// --- Port Selection ---

export type Port = 'top' | 'bottom' | 'left' | 'right';

/** Port position on a node's boundary. */
export function portPosition(
  nodeX: number, nodeY: number, port: Port,
): { x: number; y: number } {
  switch (port) {
    case 'top': return { x: nodeX + NODE_WIDTH / 2, y: nodeY };
    case 'bottom': return { x: nodeX + NODE_WIDTH / 2, y: nodeY + NODE_HEIGHT };
    case 'left': return { x: nodeX, y: nodeY + NODE_HEIGHT / 2 };
    case 'right': return { x: nodeX + NODE_WIDTH, y: nodeY + NODE_HEIGHT / 2 };
  }
}

/**
 * Select optimal exit/entry ports for an edge based on relative node positions.
 * Normalizes by node dimensions to account for aspect ratio, then biases
 * slightly toward the flow direction (vertical for TB, horizontal for LR).
 */
export function selectPorts(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  direction: 'TB' | 'LR' = 'TB',
): { fromPort: Port; toPort: Port } {
  const dx = (toPos.x + NODE_WIDTH / 2) - (fromPos.x + NODE_WIDTH / 2);
  const dy = (toPos.y + NODE_HEIGHT / 2) - (fromPos.y + NODE_HEIGHT / 2);

  const normalizedDx = Math.abs(dx) / (NODE_WIDTH + HORIZONTAL_GAP);
  const normalizedDy = Math.abs(dy) / (NODE_HEIGHT + VERTICAL_GAP);

  const effectiveDy = normalizedDy + (direction === 'TB' ? FLOW_DIRECTION_BIAS : 0);
  const effectiveDx = normalizedDx + (direction === 'LR' ? FLOW_DIRECTION_BIAS : 0);

  if (effectiveDy >= effectiveDx) {
    return dy >= 0
      ? { fromPort: 'bottom', toPort: 'top' }
      : { fromPort: 'top', toPort: 'bottom' };
  }
  return dx >= 0
    ? { fromPort: 'right', toPort: 'left' }
    : { fromPort: 'left', toPort: 'right' };
}

/** Compute Bezier control points for an edge between two ports. */
function computeControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  fromPort: Port,
  toPort: Port,
  hasLabel = false,
): { cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  const isVertical = fromPort === 'top' || fromPort === 'bottom';
  const axisDist = isVertical ? end.y - start.y : end.x - start.x;
  const cpOffset = controlPointOffset(axisDist);

  let cp1x = start.x, cp1y = start.y;
  switch (fromPort) {
    case 'bottom': cp1y += cpOffset; break;
    case 'top': cp1y -= cpOffset; break;
    case 'right': cp1x += cpOffset; break;
    case 'left': cp1x -= cpOffset; break;
  }

  let cp2x = end.x, cp2y = end.y;
  switch (toPort) {
    case 'top': cp2y -= cpOffset; break;
    case 'bottom': cp2y += cpOffset; break;
    case 'left': cp2x -= cpOffset; break;
    case 'right': cp2x += cpOffset; break;
  }

  // For labeled edges, shift CP1 laterally toward the destination so the
  // curve leans toward its target. This spreads t=0.5 label positions apart
  // for fan-out patterns, making label-to-edge association visually clear.
  if (hasLabel) {
    const crossDist = isVertical ? end.x - start.x : end.y - start.y;
    const lateralBow = crossDist * LABEL_SPREAD_FACTOR;
    if (isVertical) {
      cp1x += lateralBow;
    } else {
      cp1y += lateralBow;
    }
  }

  return { cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } };
}

/** Evaluate a cubic Bezier curve at parameter t. */
export function cubicBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Evaluate edge label position on the Bezier curve at t=0.5. */
export function edgeLabelOnCurve(
  start: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  return cubicBezierPoint(start, cp1, cp2, end, 0.5);
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
  /** On-curve anchor point (pre-displacement). Used for leader lines. */
  anchorX: number;
  anchorY: number;
}

/** Displacement threshold beyond which a leader line is drawn. */
export const LEADER_LINE_THRESHOLD = 15;

/** Extra inter-layer spacing per additional labeled edge beyond the first. */
const LABEL_GAP_PER_EDGE = EDGE_LABEL_HEIGHT + 8;

/**
 * Compute adaptive gap between each layer pair.
 * Layers connected by multiple labeled edges get extra space so labels
 * can sit on the edge naturally without being displaced by overlap resolution.
 */
export function computeLayerGaps(
  layers: string[][],
  edges: DiagramEdge[],
  layerMap: Map<string, number>,
  baseGap: number,
): number[] {
  const gaps: number[] = [];
  for (let i = 0; i < layers.length - 1; i++) {
    let labeledCount = 0;
    for (const edge of edges) {
      if (!edge.label) continue;
      const fromLayer = layerMap.get(edge.from);
      const toLayer = layerMap.get(edge.to);
      if (fromLayer === undefined || toLayer === undefined) continue;
      if ((fromLayer === i && toLayer === i + 1) || (fromLayer === i + 1 && toLayer === i)) {
        labeledCount++;
      }
    }
    gaps.push(baseGap + Math.max(0, labeledCount - 1) * LABEL_GAP_PER_EDGE);
  }
  return gaps;
}

// --- Crossing minimization ---

/**
 * Count edge crossings across all layer pairs (including cross-layer edges).
 * Edges between the same pair of layers cross when their source/target orderings
 * disagree: pos(u1) < pos(u2) but pos(v1) > pos(v2), or vice versa.
 */
export function countCrossings(layers: string[][], edges: DiagramEdge[]): number {
  const nodeIds = new Set(layers.flat());
  const layerOf = new Map<string, number>();
  const posOf = new Map<string, number>();
  for (let i = 0; i < layers.length; i++) {
    for (let j = 0; j < layers[i].length; j++) {
      layerOf.set(layers[i][j], i);
      posOf.set(layers[i][j], j);
    }
  }

  // Group edges by their (sorted) layer pair
  const edgesByPair = new Map<string, { sPos: number; tPos: number }[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const fL = layerOf.get(edge.from)!;
    const tL = layerOf.get(edge.to)!;
    if (fL === tL) continue;
    const [uId, lId] = fL < tL ? [edge.from, edge.to] : [edge.to, edge.from];
    const key = `${Math.min(fL, tL)}-${Math.max(fL, tL)}`;
    if (!edgesByPair.has(key)) edgesByPair.set(key, []);
    edgesByPair.get(key)!.push({ sPos: posOf.get(uId)!, tPos: posOf.get(lId)! });
  }

  let total = 0;
  for (const group of edgesByPair.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if ((a.sPos < b.sPos && a.tPos > b.tPos) ||
            (a.sPos > b.sPos && a.tPos < b.tPos)) {
          total++;
        }
      }
    }
  }
  return total;
}

/**
 * Reorder nodes within layers to minimize edge crossings.
 * Uses the barycenter heuristic: for each node, compute the average normalized
 * position of its neighbors in ALL layers in the sweep direction (not just the
 * adjacent layer). This handles cross-layer edges that skip intermediate layers.
 * Alternates forward and backward sweeps, tracking the best ordering found.
 */
export function minimizeCrossings(
  layers: string[][],
  edges: DiagramEdge[],
  maxIterations = 4,
): string[][] {
  if (layers.length <= 1) return layers.map(l => [...l]);

  const nodeIds = new Set(layers.flat());

  // Build adjacency
  const neighbors = new Map<string, string[]>();
  for (const id of nodeIds) neighbors.set(id, []);
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    neighbors.get(edge.from)!.push(edge.to);
    neighbors.get(edge.to)!.push(edge.from);
  }

  const layerOf = new Map<string, number>();
  for (let i = 0; i < layers.length; i++) {
    for (const id of layers[i]) layerOf.set(id, i);
  }

  const result = layers.map(l => [...l]);

  function reorderLayer(layerIdx: number, direction: 'forward' | 'backward') {
    const barycenters = new Map<string, number>();

    for (const nodeId of result[layerIdx]) {
      // Consider neighbors in all layers in the reference direction
      const refNeighbors = (neighbors.get(nodeId) ?? []).filter(n => {
        const nLayer = layerOf.get(n);
        if (nLayer === undefined) return false;
        return direction === 'forward' ? nLayer < layerIdx : nLayer > layerIdx;
      });

      if (refNeighbors.length === 0) {
        barycenters.set(nodeId, result[layerIdx].indexOf(nodeId));
        continue;
      }

      // Normalize positions to [0,1] so cross-layer positions are comparable
      const sum = refNeighbors.reduce((s, n) => {
        const nLayer = layerOf.get(n)!;
        const posInLayer = result[nLayer].indexOf(n);
        const layerSize = result[nLayer].length;
        return s + (layerSize > 1 ? posInLayer / (layerSize - 1) : 0.5);
      }, 0);
      barycenters.set(nodeId, sum / refNeighbors.length);
    }

    result[layerIdx].sort((a, b) => (barycenters.get(a) ?? 0) - (barycenters.get(b) ?? 0));
  }

  let bestCrossings = countCrossings(result, edges);
  let bestOrder = result.map(l => [...l]);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Forward sweep: fix layers above, reorder each layer top-down
    for (let i = 1; i < result.length; i++) {
      reorderLayer(i, 'forward');
    }
    // Backward sweep: fix layers below, reorder each layer bottom-up
    for (let i = result.length - 2; i >= 0; i--) {
      reorderLayer(i, 'backward');
    }

    const crossings = countCrossings(result, edges);
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      bestOrder = result.map(l => [...l]);
    }
    if (crossings === 0) break;
  }

  return bestOrder;
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
        const predecessors = incoming.get(node.id) ?? new Set();
        return [...predecessors].every(predecessorId => assigned.has(predecessorId) || !nodeIds.has(predecessorId));
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

  // Minimize edge crossings by reordering nodes within each layer
  const orderedLayers = minimizeCrossings(layers, edges);
  // Replace layer contents with optimized ordering
  for (let i = 0; i < layers.length; i++) {
    layers[i] = orderedLayers[i];
  }

  // Compute adaptive inter-layer gaps based on labeled edge density
  const baseGap = isLR ? HORIZONTAL_GAP : VERTICAL_GAP;
  const layerGaps = computeLayerGaps(layers, edges, layerMap, baseGap);

  // Cumulative layer offsets (position of each layer along the flow axis)
  const layerOffsets: number[] = [DIAGRAM_PADDING];
  const layerDimension = isLR ? NODE_WIDTH : NODE_HEIGHT;
  for (let i = 1; i < layers.length; i++) {
    layerOffsets.push(layerOffsets[i - 1] + layerDimension + layerGaps[i - 1]);
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
    const layerWidth = layerOffsets[layers.length - 1] + NODE_WIDTH + DIAGRAM_PADDING;
    const maxColumnHeight = maxLayerSize * NODE_HEIGHT + (maxLayerSize - 1) * VERTICAL_GAP + 2 * DIAGRAM_PADDING;
    totalWidth = Math.max(layerWidth, NODE_WIDTH + 2 * DIAGRAM_PADDING);
    totalHeight = Math.max(maxColumnHeight, NODE_HEIGHT + 2 * DIAGRAM_PADDING);
  } else {
    const rowWidth = Math.max(maxLayerSize * NODE_WIDTH + (maxLayerSize - 1) * HORIZONTAL_GAP + 2 * DIAGRAM_PADDING, NODE_WIDTH + 2 * DIAGRAM_PADDING);
    const colHeight = layerOffsets[layers.length - 1] + NODE_HEIGHT + DIAGRAM_PADDING;
    totalWidth = rowWidth;
    totalHeight = colHeight;
  }

  const positionedNodes: PositionedNode[] = [];

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];

    if (isLR) {
      const x = layerOffsets[layerIndex];
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
      const y = layerOffsets[layerIndex];
      for (let nodeIndex = 0; nodeIndex < layer.length; nodeIndex++) {
        const x = startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP);
        const node = nodeMap.get(layer[nodeIndex])!;
        posMap.set(node.id, { x, y });
        positionedNodes.push({ ...node, x, y });
      }
    }
  }

  // Compute edge paths with smart port selection
  const positionedEdges: PositionedEdge[] = [];
  for (const edge of edges) {
    const from = posMap.get(edge.from);
    const to = posMap.get(edge.to);
    if (!from || !to) continue;

    const { fromPort, toPort } = selectPorts(from, to, direction);
    const start = portPosition(from.x, from.y, fromPort);
    const end = portPosition(to.x, to.y, toPort);
    const { cp1, cp2 } = computeControlPoints(start, end, fromPort, toPort, !!edge.label);
    const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
    const labelPos = edgeLabelOnCurve(start, cp1, cp2, end);

    positionedEdges.push({
      ...edge,
      path,
      labelX: labelPos.x,
      labelY: labelPos.y,
      anchorX: labelPos.x,
      anchorY: labelPos.y,
    });
  }

  // --- Overlap resolution ---
  // 1. Reroute cross-layer edges around intermediate nodes
  routeCrossLayerEdges(positionedEdges, positionedNodes, layerMap, posMap, isLR, totalWidth, totalHeight);

  // 2. Snapshot on-curve anchors after rerouting but before label displacement
  for (const edge of positionedEdges) {
    edge.anchorX = edge.labelX;
    edge.anchorY = edge.labelY;
  }

  // 3. Shift edge labels away from nodes and each other
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
      const groupedNodes = groupMap.get(node.group) ?? [];
      groupedNodes.push(node);
      groupMap.set(node.group, groupedNodes);
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
