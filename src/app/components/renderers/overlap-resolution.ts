/**
 * Overlap detection and resolution for diagram layouts.
 *
 * Extracted from diagram-layout.ts so the logic is independently testable.
 * All spatial queries use axis-aligned bounding boxes (AABB).
 *
 * Self-contained: defines its own minimal types and constants to avoid
 * circular imports with diagram-layout.ts. Structural compatibility is
 * enforced by TypeScript at call sites.
 */

// Constants duplicated from diagram-layout.ts to avoid circular dependency.
// Canonical values live there — keep in sync.
const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const HORIZONTAL_GAP = 48;
const EDGE_LABEL_CHAR_WIDTH = 7;
const EDGE_LABEL_PADDING = 16;
const EDGE_LABEL_HEIGHT = 20;
const EDGE_LABEL_TEXT_OFFSET_Y = 4;
const BEZIER_CONTROL_FACTOR = 0.4;
const BEZIER_CONTROL_MIN = 20;
const REROUTE_LABEL_WEIGHT_ENDPOINT = 0.125;
const REROUTE_LABEL_WEIGHT_ROUTE = 0.75;

/** Minimal positioned-node shape needed by overlap resolution. */
export interface OverlapNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

/** Minimal positioned-edge shape needed by overlap resolution. */
export interface OverlapEdge {
  from: string;
  to: string;
  label?: string;
  path: string;
  labelX: number;
  labelY: number;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Strict AABB overlap — touching edges do not count. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
      && a.y < b.y + b.height && a.y + a.height > b.y;
}

// ---------------------------------------------------------------------------
// Bounding-box helpers
// ---------------------------------------------------------------------------

const LABEL_CLEARANCE = 6;

/** Bounding rect of an edge-label pill as rendered in DiagramRenderer. */
export function edgeLabelRect(label: string, lx: number, ly: number): Rect {
  const width = label.length * EDGE_LABEL_CHAR_WIDTH + EDGE_LABEL_PADDING;
  return {
    x: lx - width / 2,
    y: ly - EDGE_LABEL_HEIGHT + EDGE_LABEL_TEXT_OFFSET_Y,
    width,
    height: EDGE_LABEL_HEIGHT,
  };
}

export function nodeRect(node: OverlapNode, margin = 0): Rect {
  return {
    x: node.x - margin,
    y: node.y - margin,
    width: NODE_WIDTH + 2 * margin,
    height: NODE_HEIGHT + 2 * margin,
  };
}

// ---------------------------------------------------------------------------
// Core algorithm: find a non-overlapping position for a label
// ---------------------------------------------------------------------------

/**
 * Given a label's initial position and a set of obstacle rects, return
 * coordinates [x, y] where the label does not overlap any obstacle.
 *
 * Strategy:
 * 1. If the original position is clear, return it immediately.
 * 2. For every obstacle, compute four "escape" positions
 *    (above, below, left, right) with clearance.
 * 3. Sort candidates by distance from original position (prefer small moves).
 * 4. Return the first candidate that is clear of ALL obstacles.
 * 5. Guaranteed fallback: place the label below the lowest obstacle.
 */
export function findNonOverlappingPosition(
  label: string,
  origX: number,
  origY: number,
  obstacles: readonly Rect[],
): [number, number] {
  const orig = edgeLabelRect(label, origX, origY);
  if (!obstacles.some(o => rectsOverlap(orig, o))) return [origX, origY];

  const labelW = label.length * EDGE_LABEL_CHAR_WIDTH + EDGE_LABEL_PADDING;
  const labelHalfW = labelW / 2;
  const gap = 4; // px clearance beyond the obstacle edge

  const candidates: [number, number][] = [];

  for (const obs of obstacles) {
    // Above: place label so its bottom edge clears the obstacle's top
    candidates.push([origX, obs.y - EDGE_LABEL_TEXT_OFFSET_Y - gap]);
    // Below: place label so its top edge clears the obstacle's bottom
    candidates.push([origX, obs.y + obs.height + EDGE_LABEL_HEIGHT - EDGE_LABEL_TEXT_OFFSET_Y + gap]);
    // Left: center label to the left of the obstacle
    candidates.push([obs.x - labelHalfW - gap, origY]);
    // Right: center label to the right of the obstacle
    candidates.push([obs.x + obs.width + labelHalfW + gap, origY]);
  }

  // Sort by squared distance from original position (prefer small shifts)
  candidates.sort(([ax, ay], [bx, by]) => {
    const da = (ax - origX) ** 2 + (ay - origY) ** 2;
    const db = (bx - origX) ** 2 + (by - origY) ** 2;
    return da - db;
  });

  for (const [cx, cy] of candidates) {
    const rect = edgeLabelRect(label, cx, cy);
    if (!obstacles.some(o => rectsOverlap(rect, o))) {
      return [cx, cy];
    }
  }

  // Fallback: place below the lowest obstacle, guaranteed clear
  const maxBottom = Math.max(...obstacles.map(o => o.y + o.height));
  return [origX, maxBottom + EDGE_LABEL_HEIGHT - EDGE_LABEL_TEXT_OFFSET_Y + gap];
}

// ---------------------------------------------------------------------------
// Batch resolution
// ---------------------------------------------------------------------------

/**
 * Shift edge labels so they don't overlap nodes or each other.
 * Mutates edge.labelX / edge.labelY in place.
 */
export function resolveEdgeLabelOverlaps(
  edges: OverlapEdge[],
  nodes: OverlapNode[],
): void {
  const paddedNodeRects = nodes.map(n => nodeRect(n, LABEL_CLEARANCE));
  const placedRects: Rect[] = [];

  for (const edge of edges) {
    if (!edge.label) continue;

    const obstacles = [...paddedNodeRects, ...placedRects];
    const [newX, newY] = findNonOverlappingPosition(
      edge.label, edge.labelX, edge.labelY, obstacles,
    );
    edge.labelX = newX;
    edge.labelY = newY;
    placedRects.push(edgeLabelRect(edge.label, newX, newY));
  }
}

// ---------------------------------------------------------------------------
// Cross-layer edge routing
// ---------------------------------------------------------------------------

function controlPointOffset(distance: number): number {
  return Math.max(Math.abs(distance) * BEZIER_CONTROL_FACTOR, BEZIER_CONTROL_MIN);
}

/**
 * For edges that skip layers, reroute the Bezier curve around
 * any intermediate-layer nodes that sit in the path.
 * Mutates edge.path and label positions in place.
 */
export function routeCrossLayerEdges(
  edges: OverlapEdge[],
  nodes: OverlapNode[],
  layerMap: Map<string, number>,
  posMap: Map<string, { x: number; y: number }>,
  isLR: boolean,
  totalWidth: number,
  totalHeight: number,
): void {
  for (const edge of edges) {
    const fromLayer = layerMap.get(edge.from);
    const toLayer = layerMap.get(edge.to);
    if (fromLayer === undefined || toLayer === undefined) continue;

    const layerDiff = Math.abs(toLayer - fromLayer);
    if (layerDiff <= 1) continue;

    const fromPos = posMap.get(edge.from);
    const toPos = posMap.get(edge.to);
    if (!fromPos || !toPos) continue;

    const minLayer = Math.min(fromLayer, toLayer);
    const maxLayer = Math.max(fromLayer, toLayer);

    const intermediateNodes = nodes.filter(n => {
      const l = layerMap.get(n.id);
      return l !== undefined && l > minLayer && l < maxLayer;
    });
    if (intermediateNodes.length === 0) continue;

    if (isLR) {
      const fromMidY = fromPos.y + NODE_HEIGHT / 2;
      const toMidY = toPos.y + NODE_HEIGHT / 2;
      const corridorTop = Math.min(fromMidY, toMidY) - NODE_HEIGHT / 2;
      const corridorBottom = Math.max(fromMidY, toMidY) + NODE_HEIGHT / 2;

      const blocking = intermediateNodes.filter(n =>
        n.y + NODE_HEIGHT > corridorTop && n.y < corridorBottom,
      );
      if (blocking.length === 0) continue;

      const blockMinY = Math.min(...blocking.map(n => n.y));
      const blockMaxY = Math.max(...blocking.map(n => n.y + NODE_HEIGHT));
      const spaceAbove = blockMinY;
      const spaceBelow = totalHeight - blockMaxY;

      const routeY = spaceBelow >= spaceAbove
        ? blockMaxY + HORIZONTAL_GAP
        : blockMinY - HORIZONTAL_GAP;

      const startX = fromPos.x + NODE_WIDTH;
      const startY = fromPos.y + NODE_HEIGHT / 2;
      const endX = toPos.x;
      const endY = toPos.y + NODE_HEIGHT / 2;
      const cpOff = controlPointOffset(endX - startX);

      edge.path = `M ${startX} ${startY} C ${startX + cpOff} ${routeY}, ${endX - cpOff} ${routeY}, ${endX} ${endY}`;
      edge.labelX = (startX + endX) / 2;
      edge.labelY = routeY;
    } else {
      const fromMidX = fromPos.x + NODE_WIDTH / 2;
      const toMidX = toPos.x + NODE_WIDTH / 2;
      const corridorLeft = Math.min(fromMidX, toMidX) - NODE_WIDTH / 2;
      const corridorRight = Math.max(fromMidX, toMidX) + NODE_WIDTH / 2;

      const blocking = intermediateNodes.filter(n =>
        n.x + NODE_WIDTH > corridorLeft && n.x < corridorRight,
      );
      if (blocking.length === 0) continue;

      const blockMinX = Math.min(...blocking.map(n => n.x));
      const blockMaxX = Math.max(...blocking.map(n => n.x + NODE_WIDTH));
      const spaceRight = totalWidth - blockMaxX;
      const spaceLeft = blockMinX;

      const routeX = spaceRight >= spaceLeft
        ? blockMaxX + HORIZONTAL_GAP
        : blockMinX - HORIZONTAL_GAP;

      const startX = fromPos.x + NODE_WIDTH / 2;
      const startY = fromPos.y + NODE_HEIGHT;
      const endX = toPos.x + NODE_WIDTH / 2;
      const endY = toPos.y;
      const cpOff = controlPointOffset(endY - startY);

      edge.path = `M ${startX} ${startY} C ${routeX} ${startY + cpOff}, ${routeX} ${endY - cpOff}, ${endX} ${endY}`;
      edge.labelX = REROUTE_LABEL_WEIGHT_ENDPOINT * (startX + endX) + REROUTE_LABEL_WEIGHT_ROUTE * routeX;
      edge.labelY = (startY + endY) / 2;
    }
  }
}

// ---------------------------------------------------------------------------
// Diagnostic: check if any overlaps remain
// ---------------------------------------------------------------------------

/**
 * Returns true if any labeled edge overlaps a node or another label.
 * Used as an invariant check in tests.
 */
export function hasOverlaps(
  edges: readonly OverlapEdge[],
  nodes: readonly OverlapNode[],
): boolean {
  const nodeRects = nodes.map(n => nodeRect(n));
  const labelRects: Rect[] = [];

  for (const edge of edges) {
    if (!edge.label) continue;
    const lr = edgeLabelRect(edge.label, edge.labelX, edge.labelY);

    for (const nr of nodeRects) {
      if (rectsOverlap(lr, nr)) return true;
    }
    for (const prev of labelRects) {
      if (rectsOverlap(lr, prev)) return true;
    }
    labelRects.push(lr);
  }

  return false;
}
