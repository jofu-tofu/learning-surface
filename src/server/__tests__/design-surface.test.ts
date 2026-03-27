import { describe, it, expect } from 'vitest';
import { applyDesignSurface } from '../tool-handlers.js';
import { buildDocument, buildCanvasContent } from '../../test/helpers.js';
import type { LearningDocument } from '../../shared/document.js';
import type { DesignSurfaceInput } from '../../shared/schemas.js';

/** Wrapper that injects a default summary for brevity. */
function apply(doc: LearningDocument, params: Omit<DesignSurfaceInput, 'summary'> & { summary?: string }) {
  return applyDesignSurface(doc, { summary: 'test', ...params } as DesignSurfaceInput);
}

function makeDoc(overrides: Partial<LearningDocument> = {}): LearningDocument {
  return buildDocument({
    canvases: [buildCanvasContent({ id: 'arch', type: 'code', content: 'graph LR\n  A-->B' })],
    blocks: [
      { id: 'b1', type: 'text', content: 'Some text' },
      { id: 'b2', type: 'suggestions', items: ['Follow 1'] },
    ],
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Contract tests: canvases replace entirely
// ═══════════════════════════════════════════════════════════════════════════

describe('canvases: replace entirely', () => {
  it('replaces all existing canvases with the provided set', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      canvases: [{ id: 'arch', type: 'code', content: 'graph TD\n  X-->Y' }],
    });
    expect(result.canvases).toHaveLength(1);
    expect(result.canvases[0].content).toBe('graph TD\n  X-->Y');
  });

  it('old canvases with different IDs are removed', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      canvases: [{ id: 'flow', type: 'code', content: 'graph LR' }],
    });
    expect(result.canvases).toHaveLength(1);
    expect(result.canvases[0].id).toBe('flow');
    expect(result.canvases.find(c => c.id === 'arch')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Blocks: replace entirely
// ═══════════════════════════════════════════════════════════════════════════

describe('blocks: replace entirely', () => {
  it('replaces all blocks with new ones, assigns sequential IDs', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [
        { type: 'text', content: 'New explanation' },
        { type: 'interactive', prompt: 'What do you think?' },
      ],
    });
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'text', content: 'New explanation' });
    expect(result.blocks[1]).toMatchObject({ id: 'b2', type: 'interactive', prompt: 'What do you think?', response: null });
  });

  it('sets response: null on interactive blocks', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [{ type: 'interactive', prompt: 'Q?' }],
    });
    expect(result.blocks[0]).toMatchObject({ type: 'interactive', response: null });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Clear
// ═══════════════════════════════════════════════════════════════════════════

describe('clear: delete before apply', () => {
  it('clears canvases first then applies new canvas', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      clear: ['canvases'],
      canvases: [{ id: 'new', type: 'code', content: 'graph TD' }],
    });
    expect(result.canvases).toHaveLength(1);
    expect(result.canvases[0].id).toBe('new');
    // Blocks untouched
    expect(result.blocks).toHaveLength(2);
  });

  it('clears blocks', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, { clear: ['blocks'] });
    expect(result.blocks).toHaveLength(0);
    // Canvases untouched
    expect(result.canvases).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Boundary tests: error cases (partial success)
// ═══════════════════════════════════════════════════════════════════════════

describe('invalid canvas content — partial success', () => {
  it('applies valid canvas but errors on invalid diagram', () => {
    const doc = buildDocument();
    const { doc: result, results } = apply(doc, {
      canvases: [
        { id: 'good', type: 'code', content: 'graph LR' },
        { id: 'bad', type: 'diagram', content: 'not json' },
      ],
      blocks: [{ type: 'text', content: 'text' }],
    });

    expect(result.canvases.find(c => c.id === 'good')).toBeDefined();
    expect(result.canvases.find(c => c.id === 'bad')).toBeUndefined();
    expect(result.blocks[0]).toMatchObject({ type: 'text', content: 'text' });
    expect(results.canvasResults['good'].success).toBe(true);
    expect(results.canvasResults['bad'].success).toBe(false);
    expect(results.errors.length).toBeGreaterThan(0);
  });
});

describe('canvas cap exceeded', () => {
  it('errors when providing more than 4 canvases in one call', () => {
    const doc = buildDocument();
    const { doc: result, results } = apply(doc, {
      canvases: [
        { id: 'c1', type: 'code', content: 'x' },
        { id: 'c2', type: 'code', content: 'x' },
        { id: 'c3', type: 'code', content: 'x' },
        { id: 'c4', type: 'code', content: 'x' },
        { id: 'fifth', type: 'code', content: 'x' },
      ],
    });
    expect(result.canvases).toHaveLength(4);
    expect(results.canvasResults['fifth'].success).toBe(false);
    expect(results.errors[0]).toContain('Maximum 4');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Immutability
// ═══════════════════════════════════════════════════════════════════════════

describe('immutability', () => {
  it('does not mutate the input document', () => {
    const doc = makeDoc();
    const originalJson = JSON.stringify(doc);
    apply(doc, {
      blocks: [{ type: 'text', content: 'modified' }],
    });
    expect(JSON.stringify(doc)).toBe(originalJson);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Property-like tests
// ═══════════════════════════════════════════════════════════════════════════

describe('property: canvas count never exceeds 4', () => {
  it('caps at 4 even with many canvases in one call', () => {
    const doc = buildDocument();
    const { doc: result } = apply(doc, {
      canvases: [
        { id: 'a', type: 'code', content: 'x' },
        { id: 'b', type: 'code', content: 'x' },
        { id: 'c', type: 'code', content: 'x' },
        { id: 'd', type: 'code', content: 'x' },
        { id: 'e', type: 'code', content: 'x' },
      ],
    });
    expect(result.canvases.length).toBeLessThanOrEqual(4);
  });
});

describe('property: idempotence for canvas replace', () => {
  it('applying same canvas twice produces same result', () => {
    const doc = makeDoc();
    const update: DesignSurfaceInput = { summary: 'test', canvases: [{ id: 'arch', type: 'code', content: 'new' }] };
    const { doc: first } = applyDesignSurface(doc, update);
    const { doc: second } = applyDesignSurface(first, update);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('structured canvas validation', () => {
  it('validates diagram content as JSON with nodes/edges', () => {
    const doc = buildDocument();
    const validDiagram = JSON.stringify({ nodes: [{ id: 'a', label: 'A' }], edges: [{ from: 'a', to: 'b' }] });
    const { doc: result, results } = apply(doc, {
      canvases: [{ id: 'diag', type: 'diagram', content: validDiagram }],
    });
    expect(results.canvasResults['diag'].success).toBe(true);
    expect(result.canvases[0].content).toBe(validDiagram);
  });

  it('rejects diagram with missing required fields', () => {
    const doc = buildDocument();
    const invalidDiagram = JSON.stringify({ nodes: [{ id: 'a' }], edges: [] }); // missing label
    const { results } = apply(doc, {
      canvases: [{ id: 'diag', type: 'diagram', content: invalidDiagram }],
    });
    expect(results.canvasResults['diag'].success).toBe(false);
  });

  it('validates timeline content', () => {
    const doc = buildDocument();
    const validTimeline = JSON.stringify({ events: [{ id: 'e1', date: 'T0', label: 'Start' }] });
    const { results } = apply(doc, {
      canvases: [{ id: 'tl', type: 'timeline', content: validTimeline }],
    });
    expect(results.canvasResults['tl'].success).toBe(true);
  });

  it('validates proof content', () => {
    const doc = buildDocument();
    const validProof = JSON.stringify({ steps: [{ expression: 'x=1', justification: 'given' }] });
    const { results } = apply(doc, {
      canvases: [{ id: 'pf', type: 'proof', content: validProof }],
    });
    expect(results.canvasResults['pf'].success).toBe(true);
  });

  it('skips validation for non-structured types (katex, code)', () => {
    const doc = buildDocument();
    const { results } = apply(doc, {
      canvases: [{ id: 'c', type: 'code', content: 'console.log("hi")', language: 'javascript' }],
    });
    expect(results.canvasResults['c'].success).toBe(true);
  });
});

describe('block type: feedback', () => {
  it('assigns feedback blocks with targetBlockId and correct fields', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [
        { type: 'feedback', targetBlockId: 'b1', correct: true, content: 'Good job!' },
        { type: 'feedback', targetBlockId: 'b2', correct: null, content: 'Ambiguous.' },
      ],
    });
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'feedback', targetBlockId: 'b1', correct: true, content: 'Good job!' });
    expect(result.blocks[1]).toMatchObject({ id: 'b2', type: 'feedback', correct: null });
  });
});

describe('block type: deeper-patterns', () => {
  it('assigns deeper-patterns blocks with patterns array', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [
        { type: 'deeper-patterns', patterns: [{ pattern: 'Recursion', connection: 'This is recursive.' }] },
      ],
    });
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'deeper-patterns' });
    expect((result.blocks[0] as { patterns: unknown[] }).patterns).toHaveLength(1);
  });
});

describe('block type: suggestions', () => {
  it('assigns suggestions blocks with items array', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [{ type: 'suggestions', items: ['Next topic?', 'Go deeper'] }],
    });
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'suggestions', items: ['Next topic?', 'Go deeper'] });
  });
});

describe('omitting blocks leaves them untouched', () => {
  it('not providing blocks preserves existing blocks', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      canvases: [{ id: 'new', type: 'code', content: 'graph TD' }],
    });
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'text' });
  });
});

describe('omitting canvases leaves them untouched', () => {
  it('not providing canvases preserves existing canvases', () => {
    const doc = makeDoc();
    const { doc: result } = apply(doc, {
      blocks: [{ type: 'text', content: 'New' }],
    });
    expect(result.canvases).toHaveLength(1);
    expect(result.canvases[0].id).toBe('arch');
  });
});
