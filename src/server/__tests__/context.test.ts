import { describe, it, expect } from 'vitest';
import { createContextCompiler } from '../context.js';
import { buildDocument, buildSection, buildCanvasContent } from '../../test/helpers.js';

describe('ContextCompiler', () => {
  const compiler = createContextCompiler();

  describe('compile()', () => {
    it('excludes absent content keys from surface', async () => {
      const doc = buildDocument({
        activeSection: 'empty',
        sections: [buildSection({ title: 'Empty' })],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      // canvases is always present (empty array) but explanation etc are absent
      expect(ctx.surface).toEqual({ canvases: [] });
    });

    it('includes extra unknown keys from section in surface', async () => {
      const section = buildSection({ title: 'Extended', explanation: 'Hello' });
      (section as unknown as Record<string, unknown>)['flashcards'] = [{ q: 'Q1', a: 'A1' }];

      const doc = buildDocument({
        activeSection: section.id,
        sections: [section],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface['flashcards']).toEqual([{ q: 'Q1', a: 'A1' }]);
      expect(ctx.surface['explanation']).toBe('Hello');
    });

    it('includes section IDs and canvasIds in sections', async () => {
      const doc = buildDocument({
        sections: [
          buildSection({
            title: 'With Canvas',
            canvases: [buildCanvasContent({ id: 'arch' }), buildCanvasContent({ id: 'flow' })],
          }),
        ],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.sections[0].id).toBe('with-canvas');
      expect(ctx.sections[0].canvasIds).toEqual(['arch', 'flow']);
    });
  });
});
