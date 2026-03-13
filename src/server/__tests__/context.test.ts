import { describe, it, expect } from 'vitest';
import { createContextCompiler } from '../context.js';
import { buildDocument, buildSection } from '../../test/helpers.js';

describe('ContextCompiler', () => {
  const compiler = createContextCompiler();

  describe('compile()', () => {
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
