import type { LearningDocument } from '../shared/types.js';
import type { VersionMeta } from '../shared/types.js';

export interface SurfaceContext {
  session: {
    topic: string;
    version: number;
    activeSection: string;
  };
  mode: 'study' | 'answer';
  phase: 'predict' | 'explain';
  surface: Record<string, unknown>;
  sections: Array<{ id: string; title: string; canvasIds: string[] }>;
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
  compile(doc: LearningDocument, sessionDir: string, mode?: 'study' | 'answer'): Promise<SurfaceContext>;
}

export interface FileWatcherService {
  onDocumentChange(callback: (doc: LearningDocument) => void): void;
  start(sessionDir: string): void;
  stop(): void;
}
