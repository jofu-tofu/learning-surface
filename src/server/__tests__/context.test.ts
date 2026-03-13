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
      expect(ctx.surface).toEqual({});
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

    it('excludes _unknownBlocks from surface', async () => {
      const section = buildSection({ title: 'With Unknown' });
      (section as unknown as Record<string, unknown>)['_unknownBlocks'] = [{ type: 'foo', content: 'bar' }];

      const doc = buildDocument({
        activeSection: section.id,
        sections: [section],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface).not.toHaveProperty('_unknownBlocks');
    });
  });
});
