// === Core Data Types ===

export interface CanvasContent {
  type: 'mermaid' | 'katex' | 'code';
  content: string;
  language?: string; // for code type
}

export interface Check {
  id: string;
  question: string;
  status: 'unanswered' | 'attempted' | 'revealed';
  hints?: string[];
  answer?: string;
  answerExplanation?: string;
}

export interface Section {
  id: string; // slug derived from title
  title: string;
  status: 'active' | 'completed';
  canvas?: CanvasContent;
  explanation?: string;
  checks?: Check[];
  followups?: string[];
}

export interface LearningDocument {
  version: number;
  activeSection: string;
  sections: Section[];
}

// === Version Store Types ===

export interface VersionMeta {
  version: number;
  prompt: string | null;
  timestamp: string;
  source: 'ai' | 'user-edit';
  parent?: number; // for branching
}

// === Context Types ===

export interface SurfaceContext {
  session: {
    topic: string;
    version: number;
    activeSection: string;
  };
  surface: {
    canvas: CanvasContent | null;
    explanation: string | null;
    checks: Check[];
    followups: string[];
  };
  sections: Array<{ title: string; status: string }>;
  promptHistory: string[];
}

// === MCP Tool Parameter Types (derived from Zod schemas — single source of truth) ===

export type {
  ShowVisualParams,
  EditVisualParams,
  BuildVisualParams,
  AnnotateParams,
  ExplainParams,
  EditExplanationParams,
  ExtendParams,
  ChallengeParams,
  RevealParams,
  SuggestFollowupsParams,
  NewSectionParams,
  CompleteSectionParams,
  SetActiveParams,
} from './schemas.js';

// === WebSocket Message Types ===

export type PaneType = 'canvas' | 'explanation' | 'sidebar' | 'timeline' | 'interaction';

export interface WsMessage {
  type: 'document-update' | 'version-change' | 'session-init';
  document?: LearningDocument;
  version?: number;
  versions?: VersionMeta[];
  sessionDir?: string;
}

// === Module Interface Contracts ===

export interface MarkdownEngine {
  parse(raw: string): LearningDocument;
  serialize(doc: LearningDocument): string;
  applyToolCall(doc: LearningDocument, tool: string, params: Record<string, unknown>): LearningDocument;
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
  onVersionChange(callback: (version: number) => void): void;
  start(sessionDir: string): void;
  stop(): void;
}
