import { describe, it, expect } from 'vitest';
import {
  shouldCreateVersion,
  buildVersionMeta,
} from '../prompt-handler.js';
import { applyTool } from '../tool-handlers.js';
import { slugify } from '../../shared/slugify.js';
import { buildDocument, buildSection, buildCanvasContent, buildCheck } from '../../test/helpers.js';
import type { LearningDocument } from '../../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. shouldCreateVersion, buildVersionMeta
// ═══════════════════════════════════════════════════════════════════════════

describe('prompt-handler pure functions', () => {
  describe('shouldCreateVersion', () => {
    it('returns false for api mode when same version', () => {
      expect(shouldCreateVersion('api', 1, 1, '', '')).toBe(false);
    });

    it('returns false for cli mode when same content', () => {
      expect(shouldCreateVersion('cli', 1, 1, 'same', 'same')).toBe(false);
    });
  });

  describe('buildVersionMeta', () => {
    it('handles null summary', () => {
      const meta = buildVersionMeta('prompt', null, '2026-01-01T00:00:00Z');
      expect(meta.summary).toBeNull();
      expect(meta.prompt).toBe('prompt');
      expect(meta.source).toBe('ai');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. applyTool edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe('applyTool edge cases', () => {
  function makeDoc(overrides: Partial<LearningDocument> = {}): LearningDocument {
    return structuredClone(
      buildDocument({
        activeSection: 'test-section',
        sections: [
          buildSection({
            title: 'Test Section',
            canvas: buildCanvasContent({ type: 'mermaid', content: 'graph LR\n  A-->B' }),
            explanation: 'Some text',
            checks: [buildCheck({ id: 'c1', question: 'Q1' })],
            followups: ['Follow 1'],
          }),
        ],
        ...overrides,
      }),
    );
  }

  it('build_visual when canvas exists: appends with newline', () => {
    const doc = makeDoc();
    applyTool(doc, 'build_visual', { additions: 'B-->C' });
    expect(doc.sections[0].canvas!.content).toBe('graph LR\n  A-->B\nB-->C');
  });

  it('build_visual when no canvas exists: no-op (does not crash)', () => {
    const doc = makeDoc({
      sections: [buildSection({ title: 'Test Section' })],
    });
    expect(() => applyTool(doc, 'build_visual', { additions: 'B-->C' })).not.toThrow();
    expect(doc.sections[0].canvas).toBeUndefined();
  });

  it('reveal with nonexistent checkId: no-op (does not crash)', () => {
    const doc = makeDoc();
    expect(() =>
      applyTool(doc, 'reveal', {
        checkId: 'nonexistent',
        answer: 'A',
        explanation: 'E',
      }),
    ).not.toThrow();
    // Original check unchanged
    expect(doc.sections[0].checks![0].status).toBe('unanswered');
  });

  it('unknown tool name: throws Error', () => {
    const doc = makeDoc();
    expect(() => applyTool(doc, 'xyz', {})).toThrow('Unknown tool: xyz');
  });

  it('clear with target section on active section: falls back to last remaining', () => {
    const doc = makeDoc({
      activeSection: 'first',
      sections: [
        buildSection({ title: 'First', id: 'first' }),
        buildSection({ title: 'Second', id: 'second' }),
      ],
    });
    applyTool(doc, 'clear', { target: 'section' });
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].id).toBe('second');
    expect(doc.activeSection).toBe('second');
  });

  it('clear with target section with explicit section param that equals activeSection', () => {
    const doc = makeDoc({
      activeSection: 'alpha',
      sections: [
        buildSection({ title: 'Alpha', id: 'alpha' }),
        buildSection({ title: 'Beta', id: 'beta' }),
      ],
    });
    applyTool(doc, 'clear', { target: 'section', section: 'alpha' });
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].id).toBe('beta');
    expect(doc.activeSection).toBe('beta');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. slugify
// ═══════════════════════════════════════════════════════════════════════════

describe('slugify', () => {
  it('special chars: What is TCP? → what-is-tcp', () => {
    expect(slugify('What is TCP?')).toBe('what-is-tcp');
  });

  it('multiple spaces: a  b   c → a-b-c', () => {
    expect(slugify('a  b   c')).toBe('a-b-c');
  });

  it('leading/trailing: " -hello- " → hello', () => {
    expect(slugify(' -hello- ')).toBe('hello');
  });

  it('already slugified: hello-world → hello-world', () => {
    expect(slugify('hello-world')).toBe('hello-world');
  });

  it('accented/non-ascii: drops them (e.g., café → caf)', () => {
    expect(slugify('café')).toBe('caf');
  });
});
