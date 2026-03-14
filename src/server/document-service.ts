import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseSurface, serializeSurface } from './surface-file.js';
import { applyDesignSurface, type DesignSurfaceResult } from './tool-handlers.js';
import type { LearningDocument } from '../shared/types.js';
import type { DesignSurfaceInput } from '../shared/schemas.js';

// ---------------------------------------------------------------------------
// FileIO – thin abstraction over file-system primitives
// ---------------------------------------------------------------------------

/** Minimal file-system interface consumed by DocumentService. */
export interface FileIO {
  readFile(path: string, encoding: BufferEncoding): string;
  writeFile(path: string, data: string, encoding: BufferEncoding): void;
  exists(path: string): boolean;
}

/** Real fs-backed implementation (the default). */
function nodeFileIO(): FileIO {
  return {
    readFile: (path, encoding) => readFileSync(path, encoding),
    writeFile: (path, data, encoding) => writeFileSync(path, data, encoding),
    exists: (path) => existsSync(path),
  };
}

// ---------------------------------------------------------------------------
// DocumentService
// ---------------------------------------------------------------------------

/** Canonical filename for the current document within a chat directory. */
export const CURRENT_SURFACE = 'current.surface';

/**
 * Encapsulates all document I/O: reading, writing, and applying tool calls
 * to the .surface JSON file on disk.
 */
export interface DocumentService {
  /** Read and parse the current document, or null if the file doesn't exist. */
  read(filePath: string): LearningDocument | null;
  /** Read the raw file content as a string, or null if missing. */
  readRaw(filePath: string): string | null;
  /** Serialize and write a document to disk. */
  write(filePath: string, doc: LearningDocument): void;
  /** Apply a design_surface operation to the document on disk. Returns the updated doc + results.
   *  If `version` is provided, sets it on the document before writing. */
  applyDesignSurface(
    filePath: string,
    params: DesignSurfaceInput,
    version?: number,
  ): { doc: LearningDocument; results: DesignSurfaceResult };
  /** Ensure current.surface exists with a blank document. Returns the doc. */
  ensureExists(filePath: string): LearningDocument;
  /** Get the current.surface path for a chat directory. */
  filePath(chatDir: string): string;
}

export const BLANK_DOC: LearningDocument = {
  version: 0,
  activeSection: 'untitled',
  sections: [{ id: 'untitled', title: 'Untitled', canvases: [] }],
};

export function createDocumentService(io: FileIO = nodeFileIO()): DocumentService {
  function safeRead<T>(filePath: string, transform: (raw: string) => T): T | null {
    if (!io.exists(filePath)) return null;
    try { return transform(io.readFile(filePath, 'utf-8')); } catch { return null; }
  }

  return {
    read: (filePath) => safeRead(filePath, parseSurface),

    readRaw: (filePath) => safeRead(filePath, (rawContent) => rawContent),

    write(filePath, doc) {
      io.writeFile(filePath, serializeSurface(doc), 'utf-8');
    },

    applyDesignSurface(filePath, params, version) {
      const raw = io.readFile(filePath, 'utf-8');
      const doc = parseSurface(raw);
      const result = applyDesignSurface(doc, params);
      if (version !== undefined) result.doc.version = version;
      io.writeFile(filePath, serializeSurface(result.doc), 'utf-8');
      return result;
    },

    ensureExists(filePath) {
      if (!io.exists(filePath)) {
        const doc = structuredClone(BLANK_DOC);
        io.writeFile(filePath, serializeSurface(doc), 'utf-8');
        return doc;
      }
      return parseSurface(io.readFile(filePath, 'utf-8'));
    },

    filePath(chatDir) {
      return join(chatDir, CURRENT_SURFACE);
    },
  };
}
