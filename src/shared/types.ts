import type { ProviderInfo } from './providers.js';

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
  canvas?: CanvasContent;
  explanation?: string;
  checks?: Check[];
  followups?: string[];
}

export interface LearningDocument {
  version: number;
  activeSection: string;
  summary?: string; // AI-generated label for this version (used as chat title for v1)
  sections: Section[];
}

// === Version Store Types ===

export interface VersionMeta {
  version: number;
  prompt: string | null;
  summary?: string | null; // AI-generated short label for this version
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
  sections: Array<{ title: string }>;
  promptHistory: string[];
}

// === MCP Tool Parameter Types (derived from Zod schemas — single source of truth) ===

export type {
  ShowVisualParams,
  BuildVisualParams,
  ExplainParams,
  ExtendParams,
  ChallengeParams,
  RevealParams,
  SuggestFollowupsParams,
  NewSectionParams,
  SetActiveParams,
  ClearParams,
} from './schemas.js';

// === Chat Types ===

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// === Client → Server Message Types ===

export type ClientMessage =
  | { type: 'list-chats' }
  | { type: 'new-chat' }
  | { type: 'switch-chat'; chatId: string }
  | { type: 'delete-chat'; chatId: string }
  | { type: 'select-version'; version: number }
  | { type: 'select-section'; sectionId: string }
  | { type: 'prompt'; text: string; provider?: string; model?: string; fromVersion?: number }
  | { type: 'get-providers' };

// === Server → Client Message Types ===

export interface WsMessage {
  type: 'document-update' | 'version-change' | 'session-init' | 'chat-list' | 'chat-deleted' | 'provider-list' | 'provider-error';
  document?: LearningDocument;
  version?: number;
  versions?: VersionMeta[];
  sessionDir?: string;
  chats?: Chat[];
  activeChatId?: string;
  chatId?: string;
  providers?: ProviderInfo[];
  error?: string;
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
