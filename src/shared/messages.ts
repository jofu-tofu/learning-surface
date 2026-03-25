// === WebSocket Protocol Types ===
// Message types for client ↔ server communication over WebSocket.

import type { LearningDocument } from './document.js';
import type { VersionMeta, Chat } from './session.js';
import type { ProviderInfo, ReasoningEffort } from './providers.js';

// === Client → Server Message Types ===

export type ClientMessage =
  | { type: 'list-chats' }
  | { type: 'new-chat' }
  | { type: 'switch-chat'; chatId: string }
  | { type: 'delete-chat'; chatId: string }
  | { type: 'delete-chats'; chatIds: string[] }
  | { type: 'rename-chat'; chatId: string; title: string }
  | { type: 'select-version'; version: number }
  | { type: 'prompt'; text: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort; fromVersion?: number }
  | { type: 'new-chat-with-prompt'; text: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort; fromVersion?: number }
  | { type: 'submit-responses'; responses: Record<string, string> }
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
