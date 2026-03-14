import type { ProviderInfo, ReasoningEffort } from './providers.js';

// === Core Data Types ===

/** Canonical list of canvas types — single source of truth for types.ts, schemas.ts, and block definitions. */
export const CANVAS_TYPES = ['mermaid', 'katex', 'code', 'diagram', 'timeline', 'proof'] as const;
type CanvasType = (typeof CANVAS_TYPES)[number];

export interface CanvasContent {
  type: CanvasType;
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

/** Look up the active section in a document. */
export function getActiveSection(doc: LearningDocument): Section | undefined {
  return doc.sections.find(section => section.id === doc.activeSection);
}

// === Version Store Types ===

export interface VersionMeta {
  version: number;
  prompt: string | null;
  summary?: string | null; // AI-generated short label for this version
  timestamp: string;
  source: 'ai' | 'user-edit';
  parent?: number; // for branching
  changedPanes?: string[]; // panes that changed vs previous version (e.g. 'canvas', 'explanation', 'sections')
  changedSectionIds?: string[]; // section IDs that were added or modified vs previous version
}

// === Context Types ===

export interface SurfaceContext {
  session: {
    topic: string;
    version: number;
    activeSection: string;
  };
  surface: Record<string, unknown>;
  sections: Array<{ title: string }>;
  promptHistory: string[];
}

// === Chat Types ===

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Sort chats by most recently updated. */
export function sortChatsByRecent(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (chatA, chatB) => new Date(chatB.updatedAt).getTime() - new Date(chatA.updatedAt).getTime(),
  );
}

// === Client → Server Message Types ===

export type ClientMessage =
  | { type: 'list-chats' }
  | { type: 'new-chat' }
  | { type: 'switch-chat'; chatId: string }
  | { type: 'delete-chat'; chatId: string }
  | { type: 'select-version'; version: number }
  | { type: 'select-section'; sectionId: string }
  | { type: 'prompt'; text: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort; fromVersion?: number }
  | { type: 'preflight'; provider: string; model: string }
  | { type: 'get-providers' };

// === Server → Client Message Types ===

export interface WsSessionInit {
  type: 'session-init';
  sessionDir: string;
  document?: LearningDocument;
  versions: VersionMeta[];
  chats: Chat[];
  activeChatId?: string;
  providers?: ProviderInfo[];
}

export interface WsDocumentUpdate {
  type: 'document-update';
  document?: LearningDocument;
  versions?: VersionMeta[];
}

export interface WsVersionChange {
  type: 'version-change';
  document?: LearningDocument;
  version?: number;
  versions?: VersionMeta[];
}

export interface WsChatList {
  type: 'chat-list';
  chats: Chat[];
  activeChatId?: string;
}

export interface WsProviderList {
  type: 'provider-list';
  providers: ProviderInfo[];
}

export interface WsProviderError {
  type: 'provider-error';
  error: string;
}

export interface WsPreflightResult {
  type: 'preflight-result';
  ok: boolean;
  error?: string;
}

export interface WsToolProgress {
  type: 'tool-progress';
  /** Raw tool or phase name (e.g. 'show_visual', 'thinking') */
  toolName: string;
  /** 1-based step counter within the current prompt */
  step?: number;
}

export interface WsPromptComplete {
  type: 'prompt-complete';
}

export type WsMessage =
  | WsSessionInit
  | WsDocumentUpdate
  | WsVersionChange
  | WsChatList
  | WsProviderList
  | WsProviderError
  | WsPreflightResult
  | WsToolProgress
  | WsPromptComplete;

// === Module Interface Contracts ===

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
