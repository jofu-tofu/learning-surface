import { describe, it, expect } from 'vitest';
import { applyDesignSurface } from '../tool-handlers.js';
import { buildDocument, buildSection, buildCanvasContent, buildCheck } from '../../test/helpers.js';
import type { LearningDocument } from '../../shared/types.js';

function makeDoc(overrides: Partial<LearningDocument> = {}): LearningDocument {
  return buildDocument({
    activeSection: 'test-section',
    sections: [
      buildSection({
        title: 'Test Section',
        canvases: [buildCanvasContent({ id: 'arch', type: 'code', content: 'graph LR\n  A-->B' })],
        explanation: 'Some text',
        checks: [buildCheck({ id: 'c1', question: 'Q1' })],
        followups: ['Follow 1'],
      }),
    ],
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Contract tests: "omitted = untouched"
// ═══════════════════════════════════════════════════════════════════════════

describe('omitted leaf properties are untouched', () => {
  it('adding a canvas does not affect explanation, checks, followups, or unmentioned canvases', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', canvases: [{ id: 'new', type: 'code', content: 'graph TD' }] }],
    });

    const s = result.sections[0];
    expect(s.explanation).toBe('Some text');
    expect(s.checks).toHaveLength(1);
    expect(s.checks![0].id).toBe('c1');
    expect(s.followups).toEqual(['Follow 1']);
    expect(s.canvases.find(c => c.id === 'arch')).toBeDefined();
    expect(s.canvases.find(c => c.id === 'new')).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Contract tests: "specified = action"
// ═══════════════════════════════════════════════════════════════════════════

describe('explanation: replace', () => {
  it('replaces existing explanation', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', explanation: 'new explanation' }],
    });
    expect(result.sections[0].explanation).toBe('new explanation');
  });
});

describe('canvases: upsert by ID — replace existing', () => {
  it('replaces canvas with matching ID', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', canvases: [{ id: 'arch', type: 'code', content: 'graph TD\n  X-->Y' }] }],
    });
    expect(result.sections[0].canvases.find(c => c.id === 'arch')!.content).toBe('graph TD\n  X-->Y');
  });
});

describe('canvases: upsert by ID — append new', () => {
  it('appends new canvas when ID does not exist', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', canvases: [{ id: 'flow', type: 'code', content: 'graph LR' }] }],
    });
    expect(result.sections[0].canvases).toHaveLength(2);
    expect(result.sections[0].canvases[0].id).toBe('arch');
    expect(result.sections[0].canvases[1].id).toBe('flow');
  });
});

describe('checks: append', () => {
  it('appends new checks without removing existing', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', checks: [{ question: 'Q2', answer: 'A2' }] }],
    });
    expect(result.sections[0].checks).toHaveLength(2);
    expect(result.sections[0].checks![0].id).toBe('c1');
    expect(result.sections[0].checks![1].question).toBe('Q2');
  });
});

describe('followups: replace', () => {
  it('replaces existing followups', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ id: 'test-section', followups: ['new1'] }],
    });
    expect(result.sections[0].followups).toEqual(['new1']);
  });
});

describe('clear: delete before apply', () => {
  it('clears canvases first then applies new canvas', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{
        id: 'test-section',
        clear: ['canvases'],
        canvases: [{ id: 'new', type: 'code', content: 'graph TD' }],
      }],
    });
    expect(result.sections[0].canvases).toHaveLength(1);
    expect(result.sections[0].canvases[0].id).toBe('new');
    expect(result.sections[0].explanation).toBe('Some text');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Boundary tests: error cases (partial success)
// ═══════════════════════════════════════════════════════════════════════════

describe('invalid canvas content — partial success', () => {
  it('applies valid canvas and explanation but errors on invalid diagram', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'New' })],
      activeSection: 'new',
    });
    const { doc: result, results } = applyDesignSurface(doc, {
      sections: [{
        id: 'new',
        canvases: [
          { id: 'good', type: 'code', content: 'graph LR' },
          { id: 'bad', type: 'diagram', content: 'not json' },
        ],
        explanation: 'text',
      }],
    });

    expect(result.sections[0].canvases.find(c => c.id === 'good')).toBeDefined();
    expect(result.sections[0].canvases.find(c => c.id === 'bad')).toBeUndefined();
    expect(result.sections[0].explanation).toBe('text');
    expect(results.sections[0].results.canvases!['good'].success).toBe(true);
    expect(results.sections[0].results.canvases!['bad'].success).toBe(false);
    expect(results.errors.length).toBeGreaterThan(0);
  });
});

describe('canvas cap exceeded', () => {
  it('errors when adding 5th canvas to section with 4', () => {
    const doc = buildDocument({
      sections: [buildSection({
        title: 'Full',
        canvases: [
          buildCanvasContent({ id: 'c1' }),
          buildCanvasContent({ id: 'c2' }),
          buildCanvasContent({ id: 'c3' }),
          buildCanvasContent({ id: 'c4' }),
        ],
      })],
      activeSection: 'full',
    });
    const { doc: result, results } = applyDesignSurface(doc, {
      sections: [{ id: 'full', canvases: [{ id: 'fifth', type: 'code', content: 'x' }] }],
    });
    expect(result.sections[0].canvases).toHaveLength(4);
    expect(results.sections[0].results.canvases!['fifth'].success).toBe(false);
    expect(results.errors[0]).toContain('Maximum 4');
  });
});

describe('section not found', () => {
  it('returns error with available section list', () => {
    const doc = makeDoc();
    const { results } = applyDesignSurface(doc, {
      sections: [{ id: 'nonexistent' }],
    });
    expect(results.errors[0]).toContain("'nonexistent' not found");
    expect(results.errors[0]).toContain('test-section');
  });
});

describe('new section requires title', () => {
  it('errors when neither id nor title provided', () => {
    const doc = makeDoc();
    const { results } = applyDesignSurface(doc, {
      sections: [{ explanation: 'text' }],
    });
    expect(results.errors[0]).toContain("requires either 'id'");
  });
});

describe('removeSection', () => {
  it('removes section and updates active', () => {
    const doc = buildDocument({
      activeSection: 'a',
      sections: [
        buildSection({ title: 'A', id: 'a' }),
        buildSection({ title: 'B', id: 'b' }),
      ],
    });
    const { doc: result } = applyDesignSurface(doc, { removeSection: 'a' });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe('b');
    expect(result.activeSection).toBe('b');
  });

  it('errors when trying to remove last section', () => {
    const doc = makeDoc();
    const { results } = applyDesignSurface(doc, { removeSection: 'test-section' });
    expect(results.errors[0]).toContain('Cannot remove last section');
  });
});

describe('clearAll', () => {
  it('resets entire document', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, { clearAll: true });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe('start');
    expect(result.activeSection).toBe('start');
  });
});

describe('new section creation', () => {
  it('creates section from title', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{
        title: 'TCP Handshake',
        active: true,
        canvases: [{ id: 'arch', type: 'code', content: 'graph LR' }],
        explanation: 'TCP uses a three-way handshake.',
      }],
    });
    const section = result.sections.find(s => s.id === 'tcp-handshake');
    expect(section).toBeDefined();
    expect(section!.canvases).toHaveLength(1);
    expect(section!.explanation).toBe('TCP uses a three-way handshake.');
    expect(result.activeSection).toBe('tcp-handshake');
  });

  it('auto-removes empty untitled placeholder when creating new section', () => {
    const doc = buildDocument({
      activeSection: 'untitled',
      sections: [buildSection({ title: 'Untitled', id: 'untitled' })],
    });
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{ title: 'Real Section', active: true }],
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe('real-section');
    expect(result.activeSection).toBe('real-section');
  });
});

describe('immutability', () => {
  it('does not mutate the input document', () => {
    const doc = makeDoc();
    const originalJson = JSON.stringify(doc);
    applyDesignSurface(doc, {
      sections: [{ id: 'test-section', explanation: 'modified' }],
    });
    expect(JSON.stringify(doc)).toBe(originalJson);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Property-like tests
// ═══════════════════════════════════════════════════════════════════════════

describe('property: canvas count never exceeds 4', () => {
  it('caps at 4 even with many canvases in one call', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Empty' })],
      activeSection: 'empty',
    });
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{
        id: 'empty',
        canvases: [
          { id: 'a', type: 'code', content: 'x' },
          { id: 'b', type: 'code', content: 'x' },
          { id: 'c', type: 'code', content: 'x' },
          { id: 'd', type: 'code', content: 'x' },
          { id: 'e', type: 'code', content: 'x' },
        ],
      }],
    });
    expect(result.sections[0].canvases.length).toBeLessThanOrEqual(4);
  });
});

describe('property: idempotence for replace operations', () => {
  it('applying same explanation twice produces same result', () => {
    const doc = makeDoc();
    const update = { sections: [{ id: 'test-section', explanation: 'new text' }] };
    const { doc: first } = applyDesignSurface(doc, update);
    const { doc: second } = applyDesignSurface(first, update);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('structured canvas validation', () => {
  it('validates diagram content as JSON with nodes/edges', () => {
    const doc = buildDocument({ sections: [buildSection({ title: 'Test' })], activeSection: 'test' });
    const validDiagram = JSON.stringify({ nodes: [{ id: 'a', label: 'A' }], edges: [{ from: 'a', to: 'b' }] });
    const { doc: result, results } = applyDesignSurface(doc, {
      sections: [{ id: 'test', canvases: [{ id: 'diag', type: 'diagram', content: validDiagram }] }],
    });
    expect(results.sections[0].results.canvases!['diag'].success).toBe(true);
    expect(result.sections[0].canvases[0].content).toBe(validDiagram);
  });

  it('rejects diagram with missing required fields', () => {
    const doc = buildDocument({ sections: [buildSection({ title: 'Test' })], activeSection: 'test' });
    const invalidDiagram = JSON.stringify({ nodes: [{ id: 'a' }], edges: [] }); // missing label
    const { results } = applyDesignSurface(doc, {
      sections: [{ id: 'test', canvases: [{ id: 'diag', type: 'diagram', content: invalidDiagram }] }],
    });
    expect(results.sections[0].results.canvases!['diag'].success).toBe(false);
  });

  it('validates timeline content', () => {
    const doc = buildDocument({ sections: [buildSection({ title: 'Test' })], activeSection: 'test' });
    const validTimeline = JSON.stringify({ events: [{ id: 'e1', date: 'T0', label: 'Start' }] });
    const { results } = applyDesignSurface(doc, {
      sections: [{ id: 'test', canvases: [{ id: 'tl', type: 'timeline', content: validTimeline }] }],
    });
    expect(results.sections[0].results.canvases!['tl'].success).toBe(true);
  });

  it('validates proof content', () => {
    const doc = buildDocument({ sections: [buildSection({ title: 'Test' })], activeSection: 'test' });
    const validProof = JSON.stringify({ steps: [{ expression: 'x=1', justification: 'given' }] });
    const { results } = applyDesignSurface(doc, {
      sections: [{ id: 'test', canvases: [{ id: 'pf', type: 'proof', content: validProof }] }],
    });
    expect(results.sections[0].results.canvases!['pf'].success).toBe(true);
  });

  it('skips validation for non-structured types (katex, code)', () => {
    const doc = buildDocument({ sections: [buildSection({ title: 'Test' })], activeSection: 'test' });
    const { results } = applyDesignSurface(doc, {
      sections: [{ id: 'test', canvases: [{ id: 'c', type: 'code', content: 'console.log("hi")', language: 'javascript' }] }],
    });
    expect(results.sections[0].results.canvases!['c'].success).toBe(true);
  });
});

describe('checks with answer and hints', () => {
  it('appends check with all optional fields', () => {
    const doc = makeDoc();
    const { doc: result } = applyDesignSurface(doc, {
      sections: [{
        id: 'test-section',
        checks: [{
          question: 'Why?',
          answer: 'Because X',
          answerExplanation: 'X happens when Y',
          hints: ['hint1', 'hint2'],
        }],
      }],
    });
    const check = result.sections[0].checks![1];
    expect(check.question).toBe('Why?');
    expect(check.answer).toBe('Because X');
    expect(check.answerExplanation).toBe('X happens when Y');
    expect(check.hints).toEqual(['hint1', 'hint2']);
    expect(check.status).toBe('unanswered');
  });
});
