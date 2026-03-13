import type { WebSocket } from 'ws';
import type { WsMessage, WsSessionInit, WsChatList, VersionMeta, Chat } from '../../shared/types.js';
import type { ProviderInfo } from '../../shared/providers.js';
import type { LearningDocument, VersionStore } from '../../shared/types.js';

/** Canonical filename for the current document within a chat directory. */
export const CURRENT_MD = 'current.md';

/** Send a typed WsMessage over a WebSocket connection. */
export function sendMsg(ws: WebSocket, msg: WsMessage): void {
  ws.send(JSON.stringify(msg));
}

/** Build a session-init message from current state. */
export function buildSessionInitMsg(opts: {
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
export function buildChatListMsg(chats: Chat[], activeChatId?: string | null): WsChatList {
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

/** Sort chats by most recently updated. */
export function sortChatsByRecent(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Format unknown error to string. */
export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
