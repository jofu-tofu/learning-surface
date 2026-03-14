import { describe, it, expect } from 'vitest';
import { createDocumentService, BLANK_DOC } from '../document-service.js';
import { fakeFileIO, MINIMAL_DOC } from '../../test/helpers.js';

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
      expect(() => svc.applyDesignSurface('/missing.surface', { sections: [{ id: 'x' }] })).toThrow('ENOENT');
    });

    it('sets explicit version when provided', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { sections: [{ id: 'introduction', explanation: 'New' }] },
        42,
      );
      expect(updated.version).toBe(42);
    });

    it('preserves original version when version param is omitted', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const { doc: updated } = svc.applyDesignSurface(
        '/doc.surface',
        { sections: [{ id: 'introduction', explanation: 'New' }] },
      );
      expect(updated.version).toBe(1);
    });

    it('round-trips: applied change is readable back from the in-memory fs', () => {
      const io = fakeFileIO(new Map([['/doc.surface', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      svc.applyDesignSurface('/doc.surface', { sections: [{ id: 'introduction', explanation: 'Updated' }] });
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
});
