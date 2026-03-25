import type { LearningDocument } from '../shared/document.js';
import type { VersionMeta } from '../shared/session.js';
export interface SurfaceContext {
  session: { topic: string; version: number };
  surface: Record<string, unknown>;  // canvases + blocks serialized for AI
  promptHistory: string[];
}

export interface VersionStore {
  init(sessionDir: string): Promise<void>;
  createVersion(content: string, meta: Omit<VersionMeta, 'version'>): Promise<number>;
  getVersion(version: number): Promise<string>;
  getCurrentVersion(): Promise<number>;
  listVersions(): Promise<VersionMeta[]>;
  getDiff(fromVersion: number, toVersion: number): Promise<string>;
}

export interface ContextCompiler {
  compile(doc: LearningDocument, sessionDir: string): Promise<SurfaceContext>;
}

export interface FileWatcherService {
  onDocumentChange(callback: (doc: LearningDocument) => void): void;
  start(sessionDir: string): void;
  stop(): void;
}
