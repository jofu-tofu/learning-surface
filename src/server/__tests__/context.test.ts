import { describe, it, expect } from 'vitest';
import { createContextCompiler } from '../context.js';
import { buildDocument, buildCanvasContent } from '../../test/helpers.js';

describe('ContextCompiler', () => {
  const compiler = createContextCompiler();

  describe('compile()', () => {
    it('includes canvases and blocks in surface', async () => {
      const doc = buildDocument({
        canvases: [buildCanvasContent({ id: 'arch' })],
        blocks: [{ id: 'b1', type: 'text', content: 'Hello' }],
      });

      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface).toMatchObject({
        canvases: doc.canvases,
        blocks: doc.blocks,
      });
    });

    it('excludes summary from surface when absent', async () => {
      const doc = buildDocument();
      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface).not.toHaveProperty('summary');
    });

    it('includes summary in surface when present', async () => {
      const doc = buildDocument({ summary: 'TCP handshake' });
      const ctx = await compiler.compile(doc, '/tmp/test-session');
      expect(ctx.surface).toMatchObject({ summary: 'TCP handshake' });
    });

    it('derives topic from session directory basename', async () => {
      const doc = buildDocument();
      const ctx = await compiler.compile(doc, '/data/sessions/tcp-lesson');
      expect(ctx.session.topic).toBe('tcp-lesson');
    });

    it('returns empty promptHistory when no version metas exist', async () => {
      const doc = buildDocument();
      const ctx = await compiler.compile(doc, '/tmp/nonexistent-dir');
      expect(ctx.promptHistory).toEqual([]);
    });
  });
});
