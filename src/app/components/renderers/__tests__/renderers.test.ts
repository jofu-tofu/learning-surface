import { describe, it, expect } from 'vitest';
import { parseDiagramData, computeDiagramLayout } from '../DiagramRenderer.js';

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
