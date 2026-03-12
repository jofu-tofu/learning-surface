import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, serialize, applyToolCall } from './markdown.js';
import type { LearningDocument } from '../shared/types.js';
import { CURRENT_MD } from './utils/ws-helpers.js';

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
export function nodeFileIO(): FileIO {
  return {
    readFile: (path, encoding) => readFileSync(path, encoding),
    writeFile: (path, data, encoding) => writeFileSync(path, data, encoding),
    exists: (path) => existsSync(path),
  };
}

// ---------------------------------------------------------------------------
// DocumentService
// ---------------------------------------------------------------------------

/**
 * Encapsulates all document I/O: reading, writing, and applying tool calls
 * to the structured markdown file on disk. Used by both the MCP server
 * (stdio transport) and the WebSocket prompt handler (provider integration).
 */
export interface DocumentService {
  /** Read and parse the current document, or null if the file doesn't exist. */
  read(filePath: string): LearningDocument | null;
  /** Read the raw file content as a string, or null if missing. */
  readRaw(filePath: string): string | null;
  /** Serialize and write a document to disk. */
  write(filePath: string, doc: LearningDocument): void;
  /** Read → parse → applyToolCall → serialize → write. Returns the updated doc.
   *  If `version` is provided, sets it on the document before writing. */
  applyTool(filePath: string, tool: string, params: Record<string, unknown>, version?: number): LearningDocument;
  /** Ensure current.md exists with a blank document. Returns the doc. */
  ensureExists(filePath: string): LearningDocument;
  /** Get the current.md path for a chat directory. */
  filePath(chatDir: string): string;
}

export const BLANK_DOC: LearningDocument = {
  version: 0,
  activeSection: 'untitled',
  sections: [{ id: 'untitled', title: 'Untitled', status: 'active' }],
};

export function createDocumentService(io: FileIO = nodeFileIO()): DocumentService {
  return {
    read(filePath) {
      if (!io.exists(filePath)) return null;
      try {
        return parse(io.readFile(filePath, 'utf-8'));
      } catch {
        return null;
      }
    },

    readRaw(filePath) {
      if (!io.exists(filePath)) return null;
      try {
        return io.readFile(filePath, 'utf-8');
      } catch {
        return null;
      }
    },

    write(filePath, doc) {
      io.writeFile(filePath, serialize(doc), 'utf-8');
    },

    applyTool(filePath, tool, params, version) {
      const raw = io.readFile(filePath, 'utf-8');
      const doc = parse(raw);
      const updated = applyToolCall(doc, tool, params);
      if (version !== undefined) updated.version = version;
      io.writeFile(filePath, serialize(updated), 'utf-8');
      return updated;
    },

    ensureExists(filePath) {
      if (!io.exists(filePath)) {
        const doc = { ...BLANK_DOC, sections: [...BLANK_DOC.sections] };
        io.writeFile(filePath, serialize(doc), 'utf-8');
        return doc;
      }
      return parse(io.readFile(filePath, 'utf-8'));
    },

    filePath(chatDir) {
      return join(chatDir, CURRENT_MD);
    },
  };
}
