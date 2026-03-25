import { describe, it, expect } from 'vitest';
import { detectChangedPanes } from '../detectChangedPanes.js';
import type { LearningDocument } from '../document.js';

function makeDoc(overrides: Partial<LearningDocument> = {}): LearningDocument {
  return { version: 1, canvases: [], blocks: [], ...overrides };
}

describe('detectChangedPanes', () => {
  it('returns empty set when documents are identical', () => {
    const doc = makeDoc();
    expect(detectChangedPanes(doc, doc).size).toBe(0);
  });

  it('detects canvas change', () => {
    const prev = makeDoc();
    const next = makeDoc({ canvases: [{ id: 'c1', type: 'diagram', content: '{}' }] });
    const changed = detectChangedPanes(prev, next);
    expect(changed.has('canvas')).toBe(true);
    expect(changed.has('blocks')).toBe(false);
  });

  it('detects blocks change', () => {
    const prev = makeDoc();
    const next = makeDoc({ blocks: [{ id: 'b1', type: 'text', content: 'Hello' }] });
    const changed = detectChangedPanes(prev, next);
    expect(changed.has('blocks')).toBe(true);
    expect(changed.has('canvas')).toBe(false);
  });

  it('detects both panes changed', () => {
    const prev = makeDoc();
    const next = makeDoc({
      canvases: [{ id: 'c1', type: 'code', content: 'x' }],
      blocks: [{ id: 'b1', type: 'text', content: 'y' }],
    });
    const changed = detectChangedPanes(prev, next);
    expect(changed.has('canvas')).toBe(true);
    expect(changed.has('blocks')).toBe(true);
  });
});
