import type { WebSocket } from 'ws';
import type { LearningDocument } from '../../shared/document.js';
import type { WsMessage, WsSessionInit, WsChatList } from '../../shared/messages.js';
import type { VersionMeta, Chat } from '../../shared/session.js';
import { sortChatsByRecent } from '../../shared/session.js';
import type { ProviderInfo } from '../../shared/providers.js';
import type { VersionStore } from '../types.js';
import type { ChatStore } from '../chat-store.js';

/** Send a typed WsMessage over a WebSocket connection. */
export function sendMessage(ws: WebSocket, msg: WsMessage): void {
  ws.send(JSON.stringify(msg));
}

/** Build a session-init message from current state. */
export function buildSessionInitMessage(opts: {
  sessionDir: string;
  document?: LearningDocument | null;
  versions: VersionMeta[];
  chats: Chat[];
  activeChatId?: string | null;
  providers?: ProviderInfo[];
}): WsSessionInit {
  return {
    type: 'session-init',
    sessionDir: opts.sessionDir,
    document: opts.document ?? undefined,
    versions: opts.versions,
    chats: opts.chats,
    activeChatId: opts.activeChatId ?? undefined,
    providers: opts.providers,
  };
}

/** Build a chat-list message. */
export function buildChatListMessage(chats: Chat[], activeChatId?: string | null): WsChatList {
  return {
    type: 'chat-list',
    chats,
    activeChatId: activeChatId ?? undefined,
  };
}

/** Get version list from store, returning [] if no store exists. */
export async function getVersions(store: VersionStore | null): Promise<VersionMeta[]> {
  return store ? store.listVersions() : [];
}

/** Format unknown error to string. */
export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Ensure there is an active chat: pick the most recent existing chat,
 * or create a new one if none remain. Calls switchToChat with the result.
 */
export async function ensureActiveChat(
  chatStore: ChatStore,
  switchToChat: (chatId: string) => Promise<void>,
): Promise<void> {
  const chats = chatStore.listChats();
  if (chats.length > 0) {
    await switchToChat(sortChatsByRecent(chats)[0].id);
  }
  // No chats: do nothing — client will enter draft mode
}
