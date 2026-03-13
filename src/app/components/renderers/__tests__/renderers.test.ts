import { describe, it, expect } from 'vitest';
import { parseFlowchartData, computeFlowchartLayout } from '../FlowchartRenderer.js';
import { parseSequenceData } from '../SequenceRenderer.js';

describe('parseFlowchartData', () => {
  it('returns null for non-JSON', () => {
    expect(parseFlowchartData('not json')).toBeNull();
  });

  it('returns null when nodes is not an array', () => {
    expect(parseFlowchartData('{"nodes":"string","edges":[]}')).toBeNull();
  });

  it('returns null when edges is not an array', () => {
    expect(parseFlowchartData('{"nodes":[],"edges":"string"}')).toBeNull();
  });

  it('returns null when node missing id', () => {
    expect(parseFlowchartData(JSON.stringify({
      nodes: [{ label: 'no id' }], edges: [],
    }))).toBeNull();
  });

  it('returns null when node missing label', () => {
    expect(parseFlowchartData(JSON.stringify({
      nodes: [{ id: 'a' }], edges: [],
    }))).toBeNull();
  });

  it('returns null when edge missing from', () => {
    expect(parseFlowchartData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [{ to: 'a' }],
    }))).toBeNull();
  });

  it('returns null when edge missing to', () => {
    expect(parseFlowchartData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [{ from: 'a' }],
    }))).toBeNull();
  });

  it('parses valid data', () => {
    const result = parseFlowchartData(JSON.stringify({
      nodes: [{ id: 'a', label: 'A' }], edges: [],
    }));
    expect(result).toEqual({ nodes: [{ id: 'a', label: 'A' }], edges: [] });
  });
});

describe('computeFlowchartLayout', () => {
  it('returns empty layout for no nodes', () => {
    const result = computeFlowchartLayout({ nodes: [], edges: [] });
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('assigns single node to one layer', () => {
    const result = computeFlowchartLayout({
      nodes: [{ id: 'a', label: 'A' }], edges: [],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('assigns connected nodes to different layers', () => {
    const result = computeFlowchartLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b' }],
    });
    const nodeA = result.nodes.find(n => n.id === 'a')!;
    const nodeB = result.nodes.find(n => n.id === 'b')!;
    expect(nodeA.y).toBeLessThan(nodeB.y);
  });

  it('skips edges referencing missing nodes', () => {
    const result = computeFlowchartLayout({
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'missing' }],
    });
    expect(result.edges).toHaveLength(0);
  });

  it('handles cycles without infinite loop', () => {
    const result = computeFlowchartLayout({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
    });
    expect(result.nodes).toHaveLength(2);
  });
});

describe('parseSequenceData', () => {
  it('returns null for non-JSON', () => {
    expect(parseSequenceData('nope')).toBeNull();
  });

  it('returns null when actors is not an array', () => {
    expect(parseSequenceData('{"actors":"x","messages":[]}')).toBeNull();
  });

  it('returns null when actors contain non-strings', () => {
    expect(parseSequenceData(JSON.stringify({ actors: [42], messages: [] }))).toBeNull();
  });

  it('returns null when message missing from', () => {
    expect(parseSequenceData(JSON.stringify({
      actors: ['A'], messages: [{ to: 'A', label: 'hi' }],
    }))).toBeNull();
  });

  it('returns null when message missing label', () => {
    expect(parseSequenceData(JSON.stringify({
      actors: ['A', 'B'], messages: [{ from: 'A', to: 'B' }],
    }))).toBeNull();
  });

  it('parses valid data', () => {
    const result = parseSequenceData(JSON.stringify({
      actors: ['Client', 'Server'],
      messages: [{ from: 'Client', to: 'Server', label: 'GET /' }],
    }));
    expect(result).toEqual({
      actors: ['Client', 'Server'],
      messages: [{ from: 'Client', to: 'Server', label: 'GET /' }],
    });
  });
});
