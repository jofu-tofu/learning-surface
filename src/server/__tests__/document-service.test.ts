import { describe, it, expect } from 'vitest';
import { createDocumentService, BLANK_DOC } from '../document-service.js';
import { fakeFileIO, MINIMAL_DOC } from '../../test/helpers.js';
import { serialize } from '../markdown.js';

describe('DocumentService with FakeFileIO', () => {
  describe('read', () => {
    it('returns null when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(svc.read('/missing/current.md')).toBeNull();
    });

    it('returns null when file contains unparseable content', () => {
      const io = fakeFileIO(new Map([['/bad.md', '<<<garbage>>>']]));
      const svc = createDocumentService(io);
      expect(svc.read('/bad.md')).toBeNull();
    });
  });

  describe('readRaw', () => {
    it('returns null when file does not exist', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(svc.readRaw('/missing.md')).toBeNull();
    });
  });

  describe('ensureExists', () => {
    it('creates a blank document when file is missing', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      const doc = svc.ensureExists('/new/current.md');
      expect(doc.version).toBe(BLANK_DOC.version);
      expect(doc.sections).toHaveLength(1);
      // File should now exist on the in-memory filesystem
      expect(io.files.has('/new/current.md')).toBe(true);
    });

    it('returns existing document when file already exists', () => {
      const io = fakeFileIO(new Map([['/existing.md', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const doc = svc.ensureExists('/existing.md');
      expect(doc.version).toBe(1);
      expect(doc.activeSection).toBe('introduction');
    });
  });

  describe('applyTool', () => {
    it('throws when file does not exist (no silent fallback)', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      expect(() => svc.applyTool('/missing.md', 'explain', { content: 'hi' })).toThrow('ENOENT');
    });

    it('sets explicit version when provided', () => {
      const io = fakeFileIO(new Map([['/doc.md', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const updated = svc.applyTool('/doc.md', 'explain', { content: 'New explanation' }, 42);
      expect(updated.version).toBe(42);
    });

    it('preserves original version when version param is omitted', () => {
      const io = fakeFileIO(new Map([['/doc.md', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      const updated = svc.applyTool('/doc.md', 'explain', { content: 'New explanation' });
      expect(updated.version).toBe(1);
    });

    it('round-trips: applied tool is readable back from the in-memory fs', () => {
      const io = fakeFileIO(new Map([['/doc.md', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      svc.applyTool('/doc.md', 'explain', { content: 'Updated' });
      const readBack = svc.read('/doc.md');
      expect(readBack!.sections[0].explanation).toBe('Updated');
    });

    it('unknown tool name propagates error from tool-handlers', () => {
      const io = fakeFileIO(new Map([['/doc.md', MINIMAL_DOC]]));
      const svc = createDocumentService(io);
      expect(() => svc.applyTool('/doc.md', 'nonexistent', {})).toThrow('Unknown tool');
    });
  });

  describe('write', () => {
    it('serializes document to the in-memory fs', () => {
      const io = fakeFileIO();
      const svc = createDocumentService(io);
      const doc = { ...BLANK_DOC, sections: [...BLANK_DOC.sections] };
      svc.write('/out.md', doc);
      const raw = io.files.get('/out.md')!;
      expect(raw).toContain('version: 0');
    });
  });
});
