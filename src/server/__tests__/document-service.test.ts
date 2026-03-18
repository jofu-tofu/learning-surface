import { describe, it, expect } from 'vitest';
import { createDocumentService, BLANK_DOC } from '../document-service.js';
import { fakeFileIO, MINIMAL_DOC, buildDocument, buildSection, buildCanvasContent, buildCheck } from '../../test/helpers.js';
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
      expect(doc.sections).toHaveLength(1);
      expect(io.files.has('/new/current.surface')).toBe(true);
    });

    it('returns existing document when file already exists', () => {
      const io = fakeFileIO(new Map([['/existing.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const doc = svc.ensureExists('/existing.surface');
      expect(doc.version).toBe(1);
      expect(doc.activeSection).toBe('introduction');
    });
  });

  describe('applyDesignSurface', () => {
    it('throws when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(() => svc.applyDesignSurface('/missing.surface', { summary: 'test', sections: [{ id: 'x' }] })).toThrow('ENOENT');
    });

    it('sets explicit version when provided', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { summary: 'test', sections: [{ id: 'introduction', explanation: 'New' }] },
        42,
      );
      expect(updated.version).toBe(42);
    });

    it('preserves original version when version param is omitted', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { summary: 'test', sections: [{ id: 'introduction', explanation: 'New' }] },
      );
      expect(updated.version).toBe(1);
    });

    it('round-trips: applied change is readable back from the in-memory fs', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      svc.applyDesignSurface('/doc.surface', { summary: 'test', sections: [{ id: 'introduction', explanation: 'Updated' }] });
      const readBack = svc.read('/doc.surface');
      expect(readBack!.sections[0].explanation).toBe('Updated');
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

  describe('multi-section round-trip', () => {
    it('updating one section preserves untouched section through serialize → parse → apply → serialize → parse', () => {
      const multiSectionDoc = serializeSurface(buildDocument({
        activeSection: 'section-a',
        sections: [
          buildSection({
            title: 'Section A',
            canvases: [buildCanvasContent({ id: 'diag-a', type: 'code', content: 'graph A' })],
            explanation: 'Explanation A',
            deeperPatterns: [{ pattern: 'Pattern A', connection: 'Connection A' }],
            checks: [buildCheck({ id: 'c1', question: 'Q1' })],
            followups: ['Follow A'],
          }),
          buildSection({
            title: 'Section B',
            canvases: [buildCanvasContent({ id: 'diag-b', type: 'code', content: 'graph B' })],
            explanation: 'Explanation B',
            deeperPatterns: [{ pattern: 'Pattern B', connection: 'Connection B' }],
            checks: [buildCheck({ id: 'c1', question: 'Q2' })],
            followups: ['Follow B'],
          }),
        ],
      }));

      const io = fakeFileIO(new Map([['/doc.surface', multiSectionDoc]]));
      const svc = createDocumentService(io);

      // Update only section A — section B should be untouched
      svc.applyDesignSurface('/doc.surface', {
        summary: 'Update section A',
        sections: [{ id: 'section-a', explanation: 'Updated A' }],
      });

      const readBack = svc.read('/doc.surface')!;

      // Section A was updated
      expect(readBack.sections[0].explanation).toBe('Updated A');

      // Section B is completely preserved
      const sectionB = readBack.sections.find(s => s.id === 'section-b')!;
      expect(sectionB).toBeDefined();
      expect(sectionB.canvases).toHaveLength(1);
      expect(sectionB.canvases[0].content).toBe('graph B');
      expect(sectionB.explanation).toBe('Explanation B');
      expect(sectionB.deeperPatterns).toEqual([{ pattern: 'Pattern B', connection: 'Connection B' }]);
      expect(sectionB.checks).toHaveLength(1);
      expect(sectionB.followups).toEqual(['Follow B']);
    });

    it('deeperPatterns survive serialize → parseSurface round-trip', () => {
      const doc = buildDocument({
        sections: [buildSection({
          title: 'Test',
          deeperPatterns: [{ pattern: 'Feedback loops', connection: 'This topic uses feedback.' }],
        })],
        activeSection: 'test',
      });
      const serialized = serializeSurface(doc);
      const io = fakeFileIO(new Map([['/doc.surface', serialized]]));
      const svc = createDocumentService(io);
      const readBack = svc.read('/doc.surface')!;
      expect(readBack.sections[0].deeperPatterns).toEqual([
        { pattern: 'Feedback loops', connection: 'This topic uses feedback.' },
      ]);
    });
  });
});
