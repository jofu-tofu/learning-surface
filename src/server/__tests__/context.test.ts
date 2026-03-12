import { describe, it, expect } from 'vitest';
import { createContextCompiler } from '../context.js';
import { buildDocument, buildSection, buildCanvasContent, buildCheck } from '../../test/helpers.js';

describe('ContextCompiler', () => {
  const compiler = createContextCompiler();

  describe('compile()', () => {
    it('extracts active section canvas, explanation, checks, and followups', async () => {
      const doc = buildDocument({
        activeSection: 'intro',
        sections: [
          buildSection({
            title: 'Intro',
            canvas: buildCanvasContent({ type: 'mermaid', content: 'graph LR\n  A-->B' }),
            explanation: 'Some explanation',
            checks: [buildCheck({ id: 'c1', question: 'Why?' })],
            followups: ['What next?'],
          }),
        ],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface.canvas?.type).toBe('mermaid');
      expect(ctx.surface.explanation).toBe('Some explanation');
      expect(ctx.surface.checks).toHaveLength(1);
      expect(ctx.surface.followups).toContain('What next?');
    });

    it('builds sections array with title and status', async () => {
      const doc = buildDocument({
        activeSection: 'second',
        sections: [
          buildSection({ title: 'First', status: 'completed' }),
          buildSection({ title: 'Second', status: 'active' }),
        ],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.sections).toHaveLength(2);
      expect(ctx.sections[0]).toEqual({ title: 'First', status: 'completed' });
      expect(ctx.sections[1]).toEqual({ title: 'Second', status: 'active' });
    });

    it('reads meta.json files for promptHistory', async () => {
      const doc = buildDocument();
      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.promptHistory).toBeDefined();
      expect(Array.isArray(ctx.promptHistory)).toBe(true);
    });

    it('returns null canvas and explanation when active section has none', async () => {
      const doc = buildDocument({
        activeSection: 'empty',
        sections: [buildSection({ title: 'Empty' })],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface.canvas).toBeNull();
      expect(ctx.surface.explanation).toBeNull();
    });
  });
});
