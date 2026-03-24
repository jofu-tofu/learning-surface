import type { ProviderInfo, ReasoningEffort } from './providers.js';

// === Core Data Types ===

/** Canonical list of canvas types — single source of truth for types.ts, schemas.ts, and block definitions. */
export const CANVAS_TYPES = ['katex', 'code', 'diagram', 'timeline', 'proof', 'sequence'] as const;
type CanvasType = (typeof CANVAS_TYPES)[number];

/** Runtime canvas content — mirrors CanvasInputSchema in schemas.ts (same fields). */
export interface CanvasContent {
  id: string;          // unique within section, for targeting (e.g. "architecture", "data-flow")
  type: CanvasType;
  content: string;
  language?: string;   // for code type
}

export interface Check {
  id: string;
  question: string;
  status: 'unanswered' | 'attempted' | 'revealed';
  hints?: string[];
  answer: string;
  answerExplanation?: string;
}

export interface DeeperPattern {
  pattern: string;         // the recurring / universal concept
  connection: string;      // how this topic relates to it — bridges from known to new
}

export interface PredictionClaim {
  id: string;
  prompt: string;
  type: 'choice' | 'fill-blank' | 'free-text';
  options?: string[];      // for choice type
  value: string | null;    // null until learner fills it in
}

export interface PredictionScaffold {
  question: string;
  claims: PredictionClaim[];
}

export interface Section {
  id: string; // slug derived from title
  title: string;
  canvases: CanvasContent[];
  explanation?: string;
  deeperPatterns: DeeperPattern[];
  checks?: Check[];
  followups?: string[];
  phase?: 'predict' | 'explain';
  predictionScaffold?: PredictionScaffold;
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
  source: 'ai' | 'user-edit' | 'learner';
  parent?: number; // for branching
  changedPanes?: string[]; // panes that changed vs previous version (e.g. 'canvas', 'explanation', 'sections')
  changedSectionIds?: string[]; // section IDs that were added or modified vs previous version
}

// === Chat Types ===

/** Sentinel ID used for client-side draft chats that haven't been persisted yet. */
export const DRAFT_CHAT_ID = '__draft__';

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
  | { type: 'delete-chats'; chatIds: string[] }
  | { type: 'rename-chat'; chatId: string; title: string }
  | { type: 'select-version'; version: number }
  | { type: 'select-section'; sectionId: string }
  | { type: 'prompt'; text: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort; fromVersion?: number; predictionMode?: 'study' | 'answer' }
  | { type: 'new-chat-with-prompt'; text: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort; fromVersion?: number; predictionMode?: 'study' | 'answer' }
  | { type: 'submit-prediction'; sectionId: string; responses: Record<string, string> }
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

interface WsDocumentUpdate {
  type: 'document-update';
  document?: LearningDocument;
  versions?: VersionMeta[];
}

interface WsVersionChange {
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

interface WsProviderList {
  type: 'provider-list';
  providers: ProviderInfo[];
}

export interface WsProviderError {
  type: 'provider-error';
  error: string;
}

interface WsPreflightResult {
  type: 'preflight-result';
  ok: boolean;
  error?: string;
}

interface WsToolProgress {
  type: 'tool-progress';
  /** Raw tool or phase name (e.g. 'design_surface', 'thinking') */
  toolName: string;
  /** 1-based step counter within the current prompt */
  step?: number;
}

interface WsPromptComplete {
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

