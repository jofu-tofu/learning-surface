// === Session Types (server-owned state shared with the client) ===
// These types describe what the server persists and sends to the client:
// the document snapshot, version history, and chat context.
//
// UI-only transient state (processing indicators, flash animations, etc.)
// does NOT belong here — see SurfaceState in surfaceReducer.ts.

import type { LearningDocument } from './document.js';

/**
 * The canonical session state that the server persists and sends to the client.
 * Contains everything needed to describe "what this surface is right now" —
 * the document snapshot, its version history, and the chat context.
 */
export interface SurfaceSession {
  /** Current document snapshot, or null before the first version is created. */
  document: LearningDocument | null;
  /** Ordered version history for the active chat. */
  versions: VersionMeta[];
  /** Which version the user is currently viewing. */
  currentVersion: number;
  /** All chats in the session directory. */
  chats: Chat[];
  /** The active chat, or null when no chat exists yet. */
  activeChatId: string | null;
}

// === Version Store Types ===

export interface VersionMeta {
  version: number;
  prompt: string | null;
  summary?: string | null; // AI-generated short label for this version
  timestamp: string;
  source: 'ai' | 'user-edit' | 'learner';
  parent?: number; // for branching
  changedPanes?: string[]; // panes that changed vs previous version (e.g. 'canvas', 'blocks')
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
