import { describe, it, expect } from 'vitest';
import {
  type Rect,
  type OverlapNode,
  type OverlapEdge,
  rectsOverlap,
  edgeLabelRect,
  nodeRect,
  findNonOverlappingPosition,
  resolveEdgeLabelOverlaps,
  routeCrossLayerEdges,
  hasOverlaps,
} from '../overlap-resolution.js';
import { computeDiagramLayout, NODE_WIDTH, NODE_HEIGHT } from '../diagram-layout.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, x: number, y: number): OverlapNode {
  return { id, label: id.toUpperCase(), x, y };
}

function makeEdge(
  from: string, to: string, label: string,
  labelX: number, labelY: number,
): OverlapEdge {
  return { from, to, label, path: 'M 0 0 L 1 1', labelX, labelY };
}

// ---------------------------------------------------------------------------
// rectsOverlap — primitive AABB collision
// ---------------------------------------------------------------------------

describe('rectsOverlap', () => {
  it('returns false for disjoint rects', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it('returns true for intersecting rects', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(true);
  });

  it('returns false when rects share only an edge (touching)', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it('returns true when one rect is fully inside the other', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 10, y: 10, width: 5, height: 5 },
    )).toBe(true);
  });

  it('returns false for zero-dimension rect at same origin', () => {
    expect(rectsOverlap(
      { x: 5, y: 5, width: 0, height: 0 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(false);
  });

  it('handles negative coordinates correctly', () => {
    expect(rectsOverlap(
      { x: -20, y: -20, width: 30, height: 30 },
      { x: -5, y: -5, width: 10, height: 10 },
    )).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// edgeLabelRect — bounding box computation
// ---------------------------------------------------------------------------

describe('edgeLabelRect', () => {
  it('centers horizontally on labelX', () => {
    const r = edgeLabelRect('yes', 100, 100);
    expect(r.x).toBeLessThan(100);
    expect(r.x + r.width).toBeGreaterThan(100);
    // Symmetric centering
    const cx = r.x + r.width / 2;
    expect(cx).toBeCloseTo(100);
  });

  it('always has height 20', () => {
    expect(edgeLabelRect('a', 0, 0).height).toBe(20);
    expect(edgeLabelRect('a long label', 0, 0).height).toBe(20);
  });

  it('width scales with label length', () => {
    const short = edgeLabelRect('ab', 0, 0);
    const long = edgeLabelRect('abcdefgh', 0, 0);
    expect(long.width).toBeGreaterThan(short.width);
  });
});

// ---------------------------------------------------------------------------
// nodeRect
// ---------------------------------------------------------------------------

describe('nodeRect', () => {
  it('returns NODE_WIDTH x NODE_HEIGHT at node position with zero margin', () => {
    const n = makeNode('a', 50, 60);
    const r = nodeRect(n);
    expect(r).toEqual({ x: 50, y: 60, width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  it('expands uniformly with margin', () => {
    const n = makeNode('a', 50, 60);
    const r = nodeRect(n, 10);
    expect(r.x).toBe(40);
    expect(r.y).toBe(50);
    expect(r.width).toBe(NODE_WIDTH + 20);
    expect(r.height).toBe(NODE_HEIGHT + 20);
  });
});

// ---------------------------------------------------------------------------
// findNonOverlappingPosition — the core algorithm
// ---------------------------------------------------------------------------

describe('findNonOverlappingPosition', () => {
  it('returns original position when no obstacles exist', () => {
    const [x, y] = findNonOverlappingPosition('ok', 100, 100, []);
    expect(x).toBe(100);
    expect(y).toBe(100);
  });

  it('returns original position when label does not overlap any obstacle', () => {
    const obstacle: Rect = { x: 500, y: 500, width: 100, height: 50 };
    const [x, y] = findNonOverlappingPosition('ok', 100, 100, [obstacle]);
    expect(x).toBe(100);
    expect(y).toBe(100);
  });

  it('moves label off a single node it overlaps', () => {
    const obstacle: Rect = { x: 80, y: 80, width: NODE_WIDTH, height: NODE_HEIGHT };
    const [x, y] = findNonOverlappingPosition('yes', 160, 102, [obstacle]);
    // Must have moved
    expect(x !== 160 || y !== 102).toBe(true);
    // Must not overlap
    const lr = edgeLabelRect('yes', x, y);
    expect(rectsOverlap(lr, obstacle)).toBe(false);
  });

  it('clears a wide label (long text) from a node', () => {
    const obstacle: Rect = { x: 50, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    const label = 'some longer text';
    const [x, y] = findNonOverlappingPosition(label, 130, 72, [obstacle]);
    const lr = edgeLabelRect(label, x, y);
    expect(rectsOverlap(lr, obstacle)).toBe(false);
  });

  it('finds a gap between two vertically adjacent nodes', () => {
    const top: Rect = { x: 50, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    const bottom: Rect = { x: 50, y: 50 + NODE_HEIGHT + 60, width: NODE_WIDTH, height: NODE_HEIGHT };
    // Label starts inside the top node
    const [x, y] = findNonOverlappingPosition('go', 130, 72, [top, bottom]);
    const lr = edgeLabelRect('go', x, y);
    expect(rectsOverlap(lr, top)).toBe(false);
    expect(rectsOverlap(lr, bottom)).toBe(false);
  });

  it('finds a gap between two horizontally adjacent nodes', () => {
    const left: Rect = { x: 50, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    const right: Rect = { x: 50 + NODE_WIDTH + 40, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    // Label starts inside the left node
    const [x, y] = findNonOverlappingPosition('go', 130, 72, [left, right]);
    const lr = edgeLabelRect('go', x, y);
    expect(rectsOverlap(lr, left)).toBe(false);
    expect(rectsOverlap(lr, right)).toBe(false);
  });

  it('escapes when surrounded by nodes on three sides', () => {
    const top: Rect = { x: 50, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
    const mid: Rect = { x: 50, y: NODE_HEIGHT + 20, width: NODE_WIDTH, height: NODE_HEIGHT };
    const bot: Rect = { x: 50, y: 2 * (NODE_HEIGHT + 20), width: NODE_WIDTH, height: NODE_HEIGHT };
    const cx = 50 + NODE_WIDTH / 2;
    const cy = mid.y + NODE_HEIGHT / 2;
    const [x, y] = findNonOverlappingPosition('go', cx, cy, [top, mid, bot]);
    const lr = edgeLabelRect('go', x, y);
    expect(rectsOverlap(lr, top)).toBe(false);
    expect(rectsOverlap(lr, mid)).toBe(false);
    expect(rectsOverlap(lr, bot)).toBe(false);
  });

  it('always returns a non-overlapping position (guaranteed fallback)', () => {
    // Build a dense grid of obstacles
    const obstacles: Rect[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        obstacles.push({
          x: col * (NODE_WIDTH + 10),
          y: row * (NODE_HEIGHT + 10),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      }
    }
    const cx = 2 * (NODE_WIDTH + 10) + NODE_WIDTH / 2;
    const cy = 2 * (NODE_HEIGHT + 10) + NODE_HEIGHT / 2;
    const [x, y] = findNonOverlappingPosition('go', cx, cy, obstacles);
    const lr = edgeLabelRect('go', x, y);
    for (const obs of obstacles) {
      expect(rectsOverlap(lr, obs)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveEdgeLabelOverlaps — batch resolution
// ---------------------------------------------------------------------------

describe('resolveEdgeLabelOverlaps', () => {
  it('does not move labels that already have no overlap', () => {
    const e = makeEdge('a', 'b', 'ok', 500, 500);
    resolveEdgeLabelOverlaps([e], []);
    expect(e.labelX).toBe(500);
    expect(e.labelY).toBe(500);
  });

  it('moves label off a node it sits on', () => {
    const node = makeNode('n', 100, 100);
    const e = makeEdge('a', 'b', 'yes', 100 + NODE_WIDTH / 2, 100 + NODE_HEIGHT / 2);
    resolveEdgeLabelOverlaps([e], [node]);
    const lr = edgeLabelRect('yes', e.labelX, e.labelY);
    const nr: Rect = { x: 100, y: 100, width: NODE_WIDTH, height: NODE_HEIGHT };
    expect(rectsOverlap(lr, nr)).toBe(false);
  });

  it('separates two labels placed at the same position', () => {
    const e1 = makeEdge('a', 'b', 'yes', 200, 200);
    const e2 = makeEdge('c', 'd', 'no', 200, 200);
    resolveEdgeLabelOverlaps([e1, e2], []);
    const r1 = edgeLabelRect('yes', e1.labelX, e1.labelY);
    const r2 = edgeLabelRect('no', e2.labelX, e2.labelY);
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('separates three co-located labels', () => {
    const edges = [
      makeEdge('a', 'b', 'one', 200, 200),
      makeEdge('c', 'd', 'two', 200, 200),
      makeEdge('e', 'f', 'three', 200, 200),
    ];
    resolveEdgeLabelOverlaps(edges, []);
    const rects = edges.map(e => edgeLabelRect(e.label!, e.labelX, e.labelY));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('resolves label overlapping node even with wide label text', () => {
    const node = makeNode('n', 100, 100);
    const e = makeEdge('a', 'b', 'a very long label', 100 + NODE_WIDTH / 2, 100 + NODE_HEIGHT / 2);
    resolveEdgeLabelOverlaps([e], [node]);
    const lr = edgeLabelRect('a very long label', e.labelX, e.labelY);
    const nr: Rect = { x: 100, y: 100, width: NODE_WIDTH, height: NODE_HEIGHT };
    expect(rectsOverlap(lr, nr)).toBe(false);
  });

  it('skips edges without labels', () => {
    const e: OverlapEdge = { from: 'a', to: 'b', path: 'M 0 0', labelX: 100, labelY: 100 };
    resolveEdgeLabelOverlaps([e], [makeNode('n', 100, 100)]);
    expect(e.labelX).toBe(100);
    expect(e.labelY).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// routeCrossLayerEdges
// ---------------------------------------------------------------------------

describe('routeCrossLayerEdges', () => {
  it('does not modify adjacent-layer edges', () => {
    const e = makeEdge('a', 'b', 'go', 100, 100);
    const origPath = e.path;
    const layers = new Map([['a', 0], ['b', 1]]);
    const positions = new Map([['a', { x: 50, y: 50 }], ['b', { x: 50, y: 150 }]]);
    routeCrossLayerEdges([e], [makeNode('a', 50, 50), makeNode('b', 50, 150)], layers, positions, false, 300, 300);
    expect(e.path).toBe(origPath);
  });

  it('reroutes a TB edge that skips a layer with a blocking node', () => {
    const nodeA = makeNode('a', 50, 32);
    const nodeB = makeNode('b', 50, 140);
    const nodeC = makeNode('c', 50, 248);
    const e = makeEdge('a', 'c', 'skip', 130, 162);
    const origPath = e.path;
    const layers = new Map([['a', 0], ['b', 1], ['c', 2]]);
    const positions = new Map([['a', { x: 50, y: 32 }], ['b', { x: 50, y: 140 }], ['c', { x: 50, y: 248 }]]);
    routeCrossLayerEdges([e], [nodeA, nodeB, nodeC], layers, positions, false, 300, 400);
    expect(e.path).not.toBe(origPath);
  });

  it('does not reroute when intermediate node is outside the corridor', () => {
    const nodeA = makeNode('a', 50, 32);
    const nodeB = makeNode('b', 500, 140);
    const nodeC = makeNode('c', 50, 248);
    const e = makeEdge('a', 'c', 'skip', 130, 162);
    const origPath = e.path;
    const layers = new Map([['a', 0], ['b', 1], ['c', 2]]);
    const positions = new Map([['a', { x: 50, y: 32 }], ['b', { x: 500, y: 140 }], ['c', { x: 50, y: 248 }]]);
    routeCrossLayerEdges([e], [nodeA, nodeB, nodeC], layers, positions, false, 800, 400);
    expect(e.path).toBe(origPath);
  });
});

// ---------------------------------------------------------------------------
// hasOverlaps — diagnostic invariant check
// ---------------------------------------------------------------------------

describe('hasOverlaps', () => {
  it('returns false for empty layout', () => {
    expect(hasOverlaps([], [])).toBe(false);
  });

  it('returns true when a label overlaps a node', () => {
    const node = makeNode('n', 100, 100);
    const e = makeEdge('a', 'b', 'yes', 100 + NODE_WIDTH / 2, 100 + NODE_HEIGHT / 2);
    expect(hasOverlaps([e], [node])).toBe(true);
  });

  it('returns true when two labels overlap each other', () => {
    const e1 = makeEdge('a', 'b', 'yes', 200, 200);
    const e2 = makeEdge('c', 'd', 'no', 200, 200);
    expect(hasOverlaps([e1, e2], [])).toBe(true);
  });

  it('returns false after resolveEdgeLabelOverlaps fixes positions', () => {
    const node = makeNode('n', 100, 100);
    const e = makeEdge('a', 'b', 'yes', 100 + NODE_WIDTH / 2, 100 + NODE_HEIGHT / 2);
    resolveEdgeLabelOverlaps([e], [node]);
    expect(hasOverlaps([e], [node])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: full layout pipeline produces zero overlaps
// ---------------------------------------------------------------------------

describe('full layout produces zero overlaps', () => {
  it('linear chain A->B->C with labeled edges', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      edges: [
        { from: 'a', to: 'b', label: 'step 1' },
        { from: 'b', to: 'c', label: 'step 2' },
      ],
    });
    expect(hasOverlaps(result.edges, result.nodes)).toBe(false);
  });

  it('diamond graph A->B,C->D with labels', () => {
    const result = computeDiagramLayout({
      nodes: [
        { id: 'a', label: 'A' }, { id: 'b', label: 'B' },
        { id: 'c', label: 'C' }, { id: 'd', label: 'D' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'left' },
        { from: 'a', to: 'c', label: 'right' },
        { from: 'b', to: 'd', label: 'merge' },
        { from: 'c', to: 'd', label: 'merge' },
      ],
    });
    expect(hasOverlaps(result.edges, result.nodes)).toBe(false);
  });

  it('skip-layer graph A->B->C + A->C with labels', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      edges: [
        { from: 'a', to: 'b', label: 'direct' },
        { from: 'b', to: 'c', label: 'chain' },
        { from: 'a', to: 'c', label: 'skip' },
      ],
    });
    expect(hasOverlaps(result.edges, result.nodes)).toBe(false);
  });

  it('wide parallel graph with labels', () => {
    const result = computeDiagramLayout({
      nodes: [
        { id: 'root', label: 'Root' },
        { id: 'a', label: 'A' }, { id: 'b', label: 'B' },
        { id: 'c', label: 'C' }, { id: 'd', label: 'D' },
      ],
      edges: [
        { from: 'root', to: 'a', label: 'one' },
        { from: 'root', to: 'b', label: 'two' },
        { from: 'root', to: 'c', label: 'three' },
        { from: 'root', to: 'd', label: 'four' },
      ],
    });
    expect(hasOverlaps(result.edges, result.nodes)).toBe(false);
  });

  it('LR layout with labels', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      edges: [
        { from: 'a', to: 'b', label: 'go' },
        { from: 'b', to: 'c', label: 'next' },
      ],
      direction: 'LR',
    });
    expect(hasOverlaps(result.edges, result.nodes)).toBe(false);
  });

  it('no pair of nodes overlaps on complex graph', () => {
    const result = computeDiagramLayout({
      nodes: [
        { id: 'a', label: 'A' }, { id: 'b', label: 'B' },
        { id: 'c', label: 'C' }, { id: 'd', label: 'D' },
        { id: 'e', label: 'E' },
      ],
      edges: [
        { from: 'a', to: 'b' }, { from: 'a', to: 'c' },
        { from: 'b', to: 'd' }, { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
      ],
    });
    for (let i = 0; i < result.nodes.length; i++) {
      for (let j = i + 1; j < result.nodes.length; j++) {
        const ri = nodeRect(result.nodes[i]);
        const rj = nodeRect(result.nodes[j]);
        expect(rectsOverlap(ri, rj)).toBe(false);
      }
    }
  });
});
