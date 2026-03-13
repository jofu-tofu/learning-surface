import { describe, it, expect } from 'vitest';
import { parseDiagramData, computeDiagramLayout } from '../DiagramRenderer.js';
import { NODE_WIDTH, NODE_HEIGHT } from '../diagram-layout.js';
import {
  rectsOverlap,
  edgeLabelRect,
  resolveEdgeLabelOverlaps,
  type OverlapNode,
  type OverlapEdge,
} from '../overlap-resolution.js';

describe('parseDiagramData', () => {
  it('returns null for non-JSON', () => {
    expect(parseDiagramData('not json')).toBeNull();
  });

  it('returns null when nodes is not an array', () => {
    expect(parseDiagramData('{"nodes":"string","edges":[]}')).toBeNull();
  });

  it('returns null when edges is not an array', () => {
    expect(parseDiagramData('{"nodes":[],"edges":"string"}')).toBeNull();
  });

  it('returns null when node missing id', () => {
    expect(parseDiagramData(JSON.stringify({
      nodes: [{ label: 'no id' }], edges: [],
    }))).toBeNull();
  });

  it('returns null when node missing label', () => {
    expect(parseDiagramData(JSON.stringify({
      nodes: [{ id: 'a' }], edges: [],
    }))).toBeNull();
  });

  it('returns null when edge missing from', () => {
    expect(parseDiagramData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [{ to: 'a' }],
    }))).toBeNull();
  });

  it('returns null when edge missing to', () => {
    expect(parseDiagramData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [{ from: 'a' }],
    }))).toBeNull();
  });

  it('parses valid data', () => {
    const result = parseDiagramData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [],
    }));
    expect(result).toEqual({ nodes: [{ id: 'a', label: 'A' }], edges: [] });
  });
});

describe('computeDiagramLayout', () => {
  it('returns empty layout for no nodes', () => {
    const result = computeDiagramLayout({ nodes: [], edges: [] });
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('assigns single node to one layer', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }], edges: [],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('assigns connected nodes to different layers', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b' }],
    });
    const nodeA = result.nodes.find(n => n.id === 'a')!;
    const nodeB = result.nodes.find(n => n.id === 'b')!;
    expect(nodeA.y).toBeLessThan(nodeB.y);
  });

  it('skips edges referencing missing nodes', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'missing' }],
    });
    expect(result.edges).toHaveLength(0);
  });

  it('handles cycles without infinite loop', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
    });
    expect(result.nodes).toHaveLength(2);
  });

  it('LR direction positions nodes left-to-right', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b' }],
      direction: 'LR',
    });
    const nodeA = result.nodes.find(n => n.id === 'a')!;
    const nodeB = result.nodes.find(n => n.id === 'b')!;
    expect(nodeA.x).toBeLessThan(nodeB.x);
  });

  it('skips group rect for single node in a group', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A', group: 'solo' }],
      edges: [],
    });
    expect(result.groups).toHaveLength(0);
  });

  it('creates group rect when two+ nodes share a group', () => {
    const result = computeDiagramLayout({
      nodes: [
        { id: 'a', label: 'A', group: 'g1' },
        { id: 'b', label: 'B', group: 'g1' },
        { id: 'c', label: 'C' },
      ],
      edges: [],
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].group).toBe('g1');
    expect(result.groups[0].width).toBeGreaterThan(0);
  });

  it('preserves optional node fields in positioned output', () => {
    const result = computeDiagramLayout({
      nodes: [{ id: 'a', label: 'A', shape: 'diamond', category: 'decision', emphasis: 'highlighted', description: 'desc' }],
      edges: [],
    });
    const node = result.nodes[0];
    expect(node.shape).toBe('diamond');
    expect(node.category).toBe('decision');
    expect(node.emphasis).toBe('highlighted');
    expect(node.description).toBe('desc');
  });

  it('positions sibling nodes side-by-side in TB mode', () => {
    const result = computeDiagramLayout({
      nodes: [
        { id: 'root', label: 'Root' },
        { id: 'left', label: 'Left' },
        { id: 'right', label: 'Right' },
      ],
      edges: [{ from: 'root', to: 'left' }, { from: 'root', to: 'right' }],
    });
    const left = result.nodes.find(n => n.id === 'left')!;
    const right = result.nodes.find(n => n.id === 'right')!;
    // Same layer → same y, different x
    expect(left.y).toBe(right.y);
    expect(left.x).not.toBe(right.x);
  });
});

// --- Overlap detection ---

describe('rectsOverlap', () => {
  it('detects no overlap for disjoint rects', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
    )).toBe(false);
  });

  it('detects overlap for intersecting rects', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(true);
  });

  it('returns false when rects share only an edge (touching, not overlapping)', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it('detects overlap when one rect is fully inside another', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 10, y: 10, width: 5, height: 5 },
    )).toBe(true);
  });

  it('handles zero-dimension rects as non-overlapping', () => {
    expect(rectsOverlap(
      { x: 5, y: 5, width: 0, height: 0 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(false);
  });
});

describe('resolveEdgeLabelOverlaps', () => {
  it('shifts label that sits on top of a node', () => {
    const node: OverlapNode = { id: 'n', label: 'N', x: 100, y: 100 };
    // Place label directly over the node center
    const edge: OverlapEdge = {
      from: 'a', to: 'b', label: 'yes',
      path: 'M 0 0 L 1 1',
      labelX: 100 + NODE_WIDTH / 2,
      labelY: 100 + NODE_HEIGHT / 2,
    };
    const origX = edge.labelX;
    const origY = edge.labelY;

    resolveEdgeLabelOverlaps([edge], [node]);

    // Label must have moved
    const moved = edge.labelX !== origX || edge.labelY !== origY;
    expect(moved).toBe(true);
    // And must no longer overlap the node (with clearance)
    const lr = edgeLabelRect(edge.label!, edge.labelX, edge.labelY);
    const nr = { x: node.x, y: node.y, width: NODE_WIDTH, height: NODE_HEIGHT };
    expect(rectsOverlap(lr, nr)).toBe(false);
  });

  it('shifts second label when two labels overlap each other', () => {
    // Two edges with labels at the same position, no nodes to collide with
    const e1: OverlapEdge = {
      from: 'a', to: 'b', label: 'yes',
      path: 'M 0 0 L 1 1', labelX: 200, labelY: 200,
    };
    const e2: OverlapEdge = {
      from: 'c', to: 'd', label: 'no',
      path: 'M 0 0 L 1 1', labelX: 200, labelY: 200,
    };

    resolveEdgeLabelOverlaps([e1, e2], []);

    const r1 = edgeLabelRect(e1.label!, e1.labelX, e1.labelY);
    const r2 = edgeLabelRect(e2.label!, e2.labelX, e2.labelY);
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('does not shift labels that already have no overlap', () => {
    const e: OverlapEdge = {
      from: 'a', to: 'b', label: 'ok',
      path: 'M 0 0 L 1 1', labelX: 500, labelY: 500,
    };
    resolveEdgeLabelOverlaps([e], []);
    expect(e.labelX).toBe(500);
    expect(e.labelY).toBe(500);
  });
});

describe('cross-layer edge routing', () => {
  it('reroutes TB edge that would pass through intermediate node', () => {
    // A -> B -> C with an extra direct edge A -> C
    // B sits between A and C, directly in the path of A->C
    const result = computeDiagramLayout({
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c' },
      ],
    });

    // The A->C edge should be rerouted (its path differs from a straight drop)
    const directEdge = result.edges.find(e => e.from === 'a' && e.to === 'c')!;
    // The rerouted path should contain control points offset from the straight line
    // Parse path to verify control points differ from source/target x
    const nodeA = result.nodes.find(n => n.id === 'a')!;
    const nodeC = result.nodes.find(n => n.id === 'c')!;
    const straightX = (nodeA.x + nodeC.x) / 2 + NODE_WIDTH / 2;
    // The path should NOT be a straight vertical line — control points diverge
    expect(directEdge.path).not.toContain(`C ${straightX}`);
  });

  it('no nodes overlap after layout on diamond graph', () => {
    // Diamond: A -> B, A -> C, B -> D, C -> D
    const result = computeDiagramLayout({
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
      ],
    });

    // Verify no pair of nodes overlaps
    for (let i = 0; i < result.nodes.length; i++) {
      for (let j = i + 1; j < result.nodes.length; j++) {
        const ri = { x: result.nodes[i].x, y: result.nodes[i].y, width: NODE_WIDTH, height: NODE_HEIGHT };
        const rj = { x: result.nodes[j].x, y: result.nodes[j].y, width: NODE_WIDTH, height: NODE_HEIGHT };
        expect(rectsOverlap(ri, rj)).toBe(false);
      }
    }
  });
});
