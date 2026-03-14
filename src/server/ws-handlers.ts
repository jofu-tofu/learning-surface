import type { WebSocket } from 'ws';
import { createDocumentService, type DocumentService } from './document-service.js';
import { handlePrompt } from './prompt-handler.js';
import { parseSurface } from './surface-file.js';
import { getProvider as getProviderFromRegistry, listProviders } from './providers/registry.js';
import type {
  ClientMessage,
  LearningDocument,
  VersionStore,
  WsMessage,
} from '../shared/types.js';
import type { ChatStore } from './chat-store.js';
import {
  sendMessage,
  buildSessionInitMessage,
  buildChatListMessage,
  getVersions,
  ensureActiveChat,
  formatError,
} from './utils/ws-helpers.js';

/** Mutable server-side session state shared across handlers. */
export interface SessionState {
  activeChatId: string | null;
  activeVersionStore: VersionStore | null;
  latestDocument: LearningDocument | null;
}

interface HandlerDeps {
  state: SessionState;
  chatStore: ChatStore;
  broadcast: (msg: WsMessage) => void;
  switchToChat: (chatId: string) => Promise<void>;
  documentService?: DocumentService;
  getProviders?: () => import('../shared/providers.js').ProviderInfo[];
  getProvider?: (id: string) => import('../shared/providers.js').Agent | undefined;
  onPrompt?: typeof handlePrompt;
}

/** Fetch versions and broadcast the full session-init state. */
async function broadcastSessionState(deps: {
  state: SessionState;
  chatStore: ChatStore;
  broadcast: (msg: WsMessage) => void;
}): Promise<void> {
  const { state, chatStore, broadcast } = deps;
  const versions = await getVersions(state.activeVersionStore);
  broadcast(buildSessionInitMessage({
    sessionDir: state.activeChatId ? chatStore.getChatDir(state.activeChatId) : '',
    document: state.latestDocument,
    versions,
    chats: chatStore.listChats(),
    activeChatId: state.activeChatId,
  }));
}

/** Route a parsed client message to the appropriate handler. */
export async function routeMessage(
  ws: WebSocket,
  msg: ClientMessage,
  deps: HandlerDeps,
): Promise<void> {
  const { state, chatStore, broadcast, switchToChat } = deps;
  const documentService = deps.documentService ?? createDocumentService();
  const getProviders = deps.getProviders ?? listProviders;
  const providerLookup = deps.getProvider ?? getProviderFromRegistry;
  const promptHandler = deps.onPrompt ?? handlePrompt;

  switch (msg.type) {
    case 'list-chats': {
      sendMessage(ws, buildChatListMessage(chatStore.listChats(), state.activeChatId));
      return;
    }

    case 'new-chat': {
      const chat = chatStore.createChat();
      await chatStore.save();
      await switchToChat(chat.id);

      broadcast(buildChatListMessage(chatStore.listChats(), chat.id));

      sendMessage(ws, buildSessionInitMessage({
        sessionDir: chatStore.getChatDir(chat.id),
        versions: [],
        chats: chatStore.listChats(),
        activeChatId: chat.id,
      }));
      return;
    }

    case 'switch-chat': {
      const chat = chatStore.getChat(msg.chatId);
      if (!chat) return;

      await switchToChat(msg.chatId);

      await broadcastSessionState({ state, chatStore, broadcast });
      return;
    }

    case 'delete-chat': {
      const wasActive = msg.chatId === state.activeChatId;
      await chatStore.deleteChat(msg.chatId);

      if (wasActive) {
        await ensureActiveChat(chatStore, switchToChat);

        await broadcastSessionState({ state, chatStore, broadcast });
      } else {
        broadcast(buildChatListMessage(chatStore.listChats(), state.activeChatId));
      }
      return;
    }

    case 'select-version': {
      if (!state.activeVersionStore) return;

      const versionContent = await state.activeVersionStore.getVersion(msg.version);
      const doc = parseSurface(versionContent);
      const versionList = await state.activeVersionStore.listVersions();

      sendMessage(ws, {
        type: 'version-change',
        document: doc,
        version: msg.version,
        versions: versionList,
      });
      return;
    }

    case 'select-section': {
      if (!state.activeChatId) return;
      const filePath = documentService.filePath(chatStore.getChatDir(state.activeChatId));
      const doc = documentService.read(filePath);
      if (!doc) return;

      // Set active section directly and write
      doc.activeSection = msg.sectionId;
      documentService.write(filePath, doc);
      return;
    }

    case 'prompt': {
      const { provider: providerId, model: modelId, reasoningEffort, text } = msg;
      const versionLogSuffix = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
      console.log(`[prompt]${versionLogSuffix} "${text}" provider=${providerId ?? 'none'} model=${modelId ?? 'none'} effort=${reasoningEffort ?? 'default'}`);

      if (!providerId || !modelId) {
        console.log('  No provider/model selected — waiting for REPL to call MCP tools');
        return;
      }

      if (!state.activeChatId || !state.activeVersionStore) {
        sendMessage(ws, { type: 'provider-error', error: 'No active chat' });
        return;
      }

      const chatDir = chatStore.getChatDir(state.activeChatId);

      try {
        const result = await promptHandler({
          text,
          providerId,
          modelId,
          reasoningEffort,
          chatDir,
          latestDocument: state.latestDocument,
          versionStore: state.activeVersionStore,
          onProgress(toolName, step) {
            broadcast({ type: 'tool-progress', toolName, step });
          },
        });
        state.latestDocument = result.updatedDocument;
        sendMessage(ws, { type: 'prompt-complete' });
      } catch (err) {
        console.error('Provider error:', err);
        broadcast({ type: 'provider-error', error: formatError(err) });
      }
      return;
    }

    case 'preflight': {
      const provider = providerLookup(msg.provider);
      if (!provider) {
        sendMessage(ws, { type: 'preflight-result', ok: false, error: `Provider "${msg.provider}" not found` });
        return;
      }
      try {
        const result = await provider.preflight(msg.model);
        sendMessage(ws, { type: 'preflight-result', ok: result.ok, error: result.error });
      } catch (err) {
        sendMessage(ws, { type: 'preflight-result', ok: false, error: formatError(err) });
      }
      return;
    }

    case 'get-providers': {
      sendMessage(ws, { type: 'provider-list', providers: getProviders() });
      return;
    }
  }
}
