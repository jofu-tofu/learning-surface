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

  it('challenge adds check with answer and answerExplanation', () => {
    const doc = makeDoc();
    applyTool(doc, 'challenge', {
      question: 'Why?',
      answer: 'Because of X',
      answerExplanation: 'X happens when Y',
    });
    const checks = doc.sections[0].checks!;
    const added = checks[checks.length - 1];
    expect(added.question).toBe('Why?');
    expect(added.answer).toBe('Because of X');
    expect(added.answerExplanation).toBe('X happens when Y');
    expect(added.status).toBe('unanswered');
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

  it('new_section auto-removes empty untitled placeholder', () => {
    const doc = makeDoc({
      activeSection: 'untitled',
      sections: [buildSection({ title: 'Untitled', id: 'untitled' })],
    });
    applyTool(doc, 'new_section', { title: 'Real Section' });
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].id).toBe('real-section');
    expect(doc.activeSection).toBe('real-section');
  });

  it('new_section keeps non-empty untitled section', () => {
    const doc = makeDoc({
      activeSection: 'untitled',
      sections: [buildSection({ title: 'Untitled', id: 'untitled', explanation: 'Has content' })],
    });
    applyTool(doc, 'new_section', { title: 'Real Section' });
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].id).toBe('untitled');
    expect(doc.sections[1].id).toBe('real-section');
  });

  it('show_diagram sets canvas with JSON payload', () => {
    const doc = makeDoc();
    applyTool(doc, 'show_diagram', {
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'b' }],
    });
    expect(doc.sections[0].canvas!.type).toBe('diagram');
    const parsed = JSON.parse(doc.sections[0].canvas!.content);
    expect(parsed.nodes).toEqual([{ id: 'a', label: 'A' }]);
    expect(parsed.edges).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('show_diagram includes direction when provided', () => {
    const doc = makeDoc();
    applyTool(doc, 'show_diagram', {
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'b' }],
      direction: 'LR',
    });
    const parsed = JSON.parse(doc.sections[0].canvas!.content);
    expect(parsed.direction).toBe('LR');
  });

  it('challenge adds check with hints', () => {
    const doc = makeDoc();
    applyTool(doc, 'challenge', { question: 'What?', hints: ['hint1', 'hint2'] });
    const checks = doc.sections[0].checks!;
    const added = checks[checks.length - 1];
    expect(added.question).toBe('What?');
    expect(added.hints).toEqual(['hint1', 'hint2']);
  });

  it('challenge without answer: check has no answer fields', () => {
    const doc = makeDoc();
    applyTool(doc, 'challenge', { question: 'What?' });
    const checks = doc.sections[0].checks!;
    const added = checks[checks.length - 1];
    expect(added.question).toBe('What?');
    expect(added.answer).toBeUndefined();
    expect(added.answerExplanation).toBeUndefined();
  });

  it.each([
    ['canvas',      { canvas: undefined, explanation: 'Some text', checks: 1, followups: ['Follow 1'] }],
    ['explanation', { canvas: true,      explanation: undefined,   checks: 1, followups: ['Follow 1'] }],
    ['checks',     { canvas: true,      explanation: 'Some text', checks: undefined, followups: ['Follow 1'] }],
    ['followups',  { canvas: true,      explanation: 'Some text', checks: 1, followups: undefined }],
  ] as const)('clear target=%s deletes only that pane', (target, expected) => {
    const doc = makeDoc();
    applyTool(doc, 'clear', { target });
    const s = doc.sections[0];
    if (expected.canvas === undefined) expect(s.canvas).toBeUndefined();
    else expect(s.canvas).toBeDefined();
    if (expected.explanation === undefined) expect(s.explanation).toBeUndefined();
    else expect(s.explanation).toBe(expected.explanation);
    if (expected.checks === undefined) expect(s.checks).toBeUndefined();
    else expect(s.checks).toHaveLength(expected.checks);
    if (expected.followups === undefined) expect(s.followups).toBeUndefined();
    else expect(s.followups).toEqual(expected.followups);
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
