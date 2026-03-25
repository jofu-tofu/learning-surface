import { describe, it, expect } from 'vitest';
import { createDocumentService, BLANK_DOC } from '../document-service.js';
import { fakeFileIO, MINIMAL_DOC, buildDocument, buildCanvasContent } from '../../test/helpers.js';
import { serializeSurface } from '../surface-file.js';

describe('DocumentService with FakeFileIO', () => {
  describe('read', () => {
    it('returns null when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(svc.read('/missing/current.surface')).toBeNull();
    });

    it('returns null when file contains unparseable content', () => {
      const io = fakeFileIO(new Map([['/bad.surface', '<<<garbage>>>']]));
      const svc = createDocumentService(io);
      expect(svc.read('/bad.surface')).toBeNull();
    });
  });

  describe('readRaw', () => {
    it('returns null when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(svc.readRaw('/missing.surface')).toBeNull();
    });
  });

  describe('ensureExists', () => {
    it('creates a blank document when file is missing', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      const doc = svc.ensureExists('/new/current.surface');
      expect(doc.version).toBe(BLANK_DOC.version);
      expect(doc.canvases).toHaveLength(0);
      expect(doc.blocks).toHaveLength(0);
      expect(io.files.has('/new/current.surface')).toBe(true);
    });

    it('returns existing document when file already exists', () => {
      const io = fakeFileIO(new Map([['/existing.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const doc = svc.ensureExists('/existing.surface');
      expect(doc.version).toBe(1);
    });
  });

  describe('applyDesignSurface', () => {
    it('throws when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(() => svc.applyDesignSurface('/missing.surface', { summary: 'test' })).toThrow('ENOENT');
    });

    it('sets explicit version when provided', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { summary: 'test', blocks: [{ type: 'text', content: 'New' }] },
        42,
      );
      expect(updated.version).toBe(42);
    });

    it('preserves original version when version param is omitted', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { summary: 'test', blocks: [{ type: 'text', content: 'New' }] },
      );
      expect(updated.version).toBe(1);
    });

    it('round-trips: applied change is readable back from the in-memory fs', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      svc.applyDesignSurface('/doc.surface', { summary: 'test', blocks: [{ type: 'text', content: 'Updated' }] });
      const readBack = svc.read('/doc.surface');
      const textBlock = readBack!.blocks.find(b => b.type === 'text');
      expect(textBlock).toBeDefined();
      expect(textBlock!.type === 'text' && textBlock!.content).toBe('Updated');
    });
  });

  describe('write', () => {
    it('serializes document to the in-memory fs', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      const doc = structuredClone(BLANK_DOC);
      svc.write('/out.surface', doc);
      const raw = io.files.get('/out.surface')!;
      expect(raw).toContain('"version": 0');
    });
  });

  describe('flat model round-trip', () => {
    it('canvases and blocks survive serialize → parse → apply → serialize → parse', () => {
      const doc = serializeSurface(buildDocument({
        canvases: [buildCanvasContent({ id: 'diag-a', type: 'code', content: 'graph A' })],
        blocks: [
          { id: 'b1', type: 'text', content: 'Explanation' },
          { id: 'b2', type: 'deeper-patterns', patterns: [{ pattern: 'Pattern A', connection: 'Connection A' }] },
          { id: 'b3', type: 'suggestions', items: ['Follow A'] },
        ],
      }));

      const io = fakeFileIO(new Map([['/doc.surface', doc]]));
      const svc = createDocumentService(io);

      // Update blocks — canvases should be untouched
      svc.applyDesignSurface('/doc.surface', {
        summary: 'Update blocks',
        blocks: [{ type: 'text', content: 'Updated' }],
      });

      const readBack = svc.read('/doc.surface')!;

      // Canvas preserved
      expect(readBack.canvases).toHaveLength(1);
      expect(readBack.canvases[0].content).toBe('graph A');

      // Blocks replaced
      expect(readBack.blocks).toHaveLength(1);
      expect(readBack.blocks[0]).toMatchObject({ type: 'text', content: 'Updated' });
    });

    it('deeper-patterns blocks survive serialize → parse round-trip', () => {
      const doc = buildDocument({
        blocks: [{
          id: 'b1',
          type: 'deeper-patterns',
          patterns: [{ pattern: 'Feedback loops', connection: 'This topic uses feedback.' }],
        }],
      });
      const serialized = serializeSurface(doc);
      const io = fakeFileIO(new Map([['/doc.surface', serialized]]));
      const svc = createDocumentService(io);
      const readBack = svc.read('/doc.surface')!;
      const block = readBack.blocks[0];
      expect(block.type).toBe('deeper-patterns');
      expect(block.type === 'deeper-patterns' && block.patterns).toEqual([
        { pattern: 'Feedback loops', connection: 'This topic uses feedback.' },
      ]);
    });
  });
});
