import { describe, it, expect } from 'vitest';
import { detectChangedPanes, detectChangedSections } from '../detectChangedPanes.js';
import { buildDocument, buildSection, buildCanvasContent } from '../../test/helpers.js';

describe('detectChangedPanes', () => {
  it('maps unknown Section keys to their own pane name', () => {
    const sectionA = buildSection({ title: 'A' });
    (sectionA as unknown as Record<string, unknown>)['flashcards'] = [{ q: 'Q1' }];

    const prev = buildDocument({ sections: [buildSection({ title: 'A' })], activeSection: 'a' });
    const next = buildDocument({ sections: [sectionA], activeSection: 'a' });

    const changed = detectChangedPanes(prev, next);
    expect(changed.has('flashcards')).toBe(true);
  });

  it('groups checks and followups under explanation pane', () => {
    const prev = buildDocument({
      sections: [buildSection({ title: 'A' })],
      activeSection: 'a',
    });
    const next = buildDocument({
      sections: [buildSection({ title: 'A', followups: ['Why?'] })],
      activeSection: 'a',
    });

    const changed = detectChangedPanes(prev, next);
    expect(changed.has('explanation')).toBe(true);
    expect(changed.has('followups')).toBe(false);
  });

  it('detects canvases change as canvas pane', () => {
    const prev = buildDocument({
      sections: [buildSection({ title: 'A' })],
      activeSection: 'a',
    });
    const next = buildDocument({
      sections: [buildSection({ title: 'A', canvases: [buildCanvasContent({ id: 'x' })] })],
      activeSection: 'a',
    });

    const changed = detectChangedPanes(prev, next);
    expect(changed.has('canvas')).toBe(true);
  });

  it('does not flag pane when both sections lack a key', () => {
    const prev = buildDocument({ sections: [buildSection({ title: 'A' })], activeSection: 'a' });
    const next = buildDocument({ sections: [buildSection({ title: 'A' })], activeSection: 'a' });

    const changed = detectChangedPanes(prev, next);
    expect(changed.size).toBe(0);
  });
});

describe('detectChangedSections', () => {
  it('detects sections with extra unknown keys as changed', () => {
    const sectionA = buildSection({ title: 'A' });
    const sectionB = buildSection({ title: 'A' });
    (sectionB as unknown as Record<string, unknown>)['flashcards'] = [{ q: 'Q1' }];

    const prev = buildDocument({ sections: [sectionA], activeSection: 'a' });
    const next = buildDocument({ sections: [sectionB], activeSection: 'a' });

    const changed = detectChangedSections(prev, next);
    expect(changed.has('a')).toBe(true);
  });
});
