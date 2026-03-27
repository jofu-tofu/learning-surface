/**
 * Centralized session state + broadcasting.
 *
 * All server-side state mutations go through the bus, which ensures
 * clients are notified with the right messages in the right order.
 * Handlers and the file watcher call bus methods instead of manually
 * calling broadcast() — the bus is the *only* path to broadcast.
 *
 * Per-client messages (preflight-result, version-change, prompt-complete)
 * still use sendMessage(ws, …) in the handler — those are responses to
 * a specific client, not state changes that all clients need.
 */

import type { LearningDocument } from '../shared/document.js';
import type { WsMessage, WsSessionInit } from '../shared/messages.js';
import type { ProviderInfo } from '../shared/providers.js';
import { sortChatsByRecent } from '../shared/session.js';
import type { VersionStore, FileWatcherService } from './types.js';
import type { ChatStore } from './chat-store.js';
import type { DocumentService } from './document-service.js';
import {
  buildSessionInitMessage,
  buildChatListMessage,
  formatError,
} from './utils/ws-helpers.js';
import { createChatLogger } from './logger.js';

// ── Public interface ────────────────────────────────────────────────

export interface SessionBus {
  // --- Bookkeeping (no broadcast needed) ---
  lastProvider?: string;
  lastModel?: string;

  // --- Read-only state (mutated only through methods below) ---
  readonly activeChatId: string | null;
  readonly activeVersionStore: VersionStore | null;
  readonly latestDocument: LearningDocument | null;

  // --- Lifecycle ---

  /** Switch to a chat. Manages watcher + version store lifecycle. */
  switchToChat(chatId: string): Promise<void>;

  /** Ensure at least one chat exists and is active. */
  ensureActiveChat(): Promise<void>;

  // --- Broadcast mutations ---

  /**
   * Document content changed (called by the file watcher).
   * Updates latestDocument, auto-names the chat, broadcasts document-update.
   */
  documentChanged(doc: LearningDocument): Promise<void>;

  /**
   * Prompt or response submission completed.
   * Updates latestDocument, bumps chat updatedAt,
   * broadcasts document-update + chat-list.
   */
  completedWithDocument(doc: LearningDocument): Promise<void>;

  /** Chat list modified (create/delete/rename). Broadcasts chat-list. */
  chatListChanged(): void;

  /** Full state reset needed. Broadcasts session-init. */
  broadcastFullState(): Promise<void>;

  /** Tool progress during AI processing. Broadcasts tool-progress. */
  toolProgress(toolName: string, step: number): void;

  /** Provider error. Broadcasts provider-error. */
  providerError(error: string): void;

  // --- Query ---

  /** Build a session-init message (e.g. for a new WebSocket connection). */
  buildSessionInit(providers?: ProviderInfo[]): Promise<WsSessionInit>;
}

// ── Dependencies ────────────────────────────────────────────────────

export interface SessionBusDeps {
  chatStore: ChatStore;
  broadcast: (msg: WsMessage) => void;
  initVersionStore: (chatId: string) => Promise<VersionStore>;
  documentService: DocumentService;
  watcher: FileWatcherService;
}

// ── Factory ─────────────────────────────────────────────────────────

export function createSessionBus(deps: SessionBusDeps): SessionBus {
  const { chatStore, broadcast, initVersionStore, documentService, watcher } = deps;

  let _activeChatId: string | null = null;
  let _activeVersionStore: VersionStore | null = null;
  let _latestDocument: LearningDocument | null = null;
  let switchLock = Promise.resolve();

  async function versionsList() {
    return _activeVersionStore ? _activeVersionStore.listVersions() : [];
  }

  function sessionDir(): string {
    return _activeChatId ? chatStore.getChatDir(_activeChatId) : '';
  }

  // Wire file watcher → bus.documentChanged
  watcher.onDocumentChange(async (doc) => {
    await bus.documentChanged(doc);
  });

  const bus: SessionBus = {
    lastProvider: undefined,
    lastModel: undefined,

    get activeChatId() { return _activeChatId; },
    get activeVersionStore() { return _activeVersionStore; },
    get latestDocument() { return _latestDocument; },

    // ── Lifecycle ───────────────────────────────────────────────

    async switchToChat(chatId: string): Promise<void> {
      const op = switchLock.then(async () => {
        watcher.stop();
        _activeChatId = chatId;
        _activeVersionStore = await initVersionStore(chatId);

        const chatDir = chatStore.getChatDir(chatId);
        _latestDocument = documentService.read(documentService.filePath(chatDir));

        const log = createChatLogger(chatDir);
        log.info('Chat activated', { chatId });

        watcher.start(chatDir);
      });
      switchLock = op.catch((err) =>
        console.error('switchToChat failed', { error: formatError(err) }),
      );
      return op;
    },

    async ensureActiveChat(): Promise<void> {
      const chats = chatStore.listChats();
      if (chats.length > 0) {
        await bus.switchToChat(sortChatsByRecent(chats)[0].id);
      } else {
        // No chats remain — clear state
        watcher.stop();
        _activeChatId = null;
        _activeVersionStore = null;
        _latestDocument = null;
      }
    },

    // ── Broadcast mutations ─────────────────────────────────────

    async documentChanged(doc: LearningDocument): Promise<void> {
      _latestDocument = doc;

      // Auto-name chat from the first version's summary
      if (_activeChatId && doc.summary) {
        const chat = chatStore.getChat(_activeChatId);
        if (chat && chat.title === 'New Chat') {
          await chatStore.updateChatTitle(_activeChatId, doc.summary);
          bus.chatListChanged();
        }
      }

      const versions = await versionsList();
      broadcast({ type: 'document-update', document: doc, versions });
    },

    async completedWithDocument(doc: LearningDocument): Promise<void> {
      _latestDocument = doc;

      const versions = await versionsList();
      broadcast({ type: 'document-update', document: doc, versions });

      if (_activeChatId) {
        await chatStore.touchChat(_activeChatId);
        bus.chatListChanged();
      }
    },

    chatListChanged(): void {
      broadcast(buildChatListMessage(chatStore.listChats(), _activeChatId));
    },

    async broadcastFullState(): Promise<void> {
      const versions = await versionsList();
      broadcast(buildSessionInitMessage({
        sessionDir: sessionDir(),
        document: _latestDocument,
        versions,
        chats: chatStore.listChats(),
        activeChatId: _activeChatId,
      }));
    },

    toolProgress(toolName: string, step: number): void {
      broadcast({ type: 'tool-progress', toolName, step });
    },

    providerError(error: string): void {
      broadcast({ type: 'provider-error', error });
    },

    // ── Query ───────────────────────────────────────────────────

    async buildSessionInit(providers?: ProviderInfo[]): Promise<WsSessionInit> {
      const versions = await versionsList();
      return buildSessionInitMessage({
        sessionDir: sessionDir(),
        document: _latestDocument,
        versions,
        chats: chatStore.listChats(),
        activeChatId: _activeChatId,
        providers,
      });
    },
  };

  return bus;
}
