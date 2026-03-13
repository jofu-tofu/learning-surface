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
});
