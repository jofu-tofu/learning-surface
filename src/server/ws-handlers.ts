import type { WebSocket } from 'ws';
import { createDocumentService, type DocumentService } from './document-service.js';
import { handlePrompt } from './prompt-handler.js';
import { listProviders } from './providers/registry.js';
import type {
  ClientMessage,
  LearningDocument,
  VersionStore,
  WsMessage,
} from '../shared/types.js';
import type { ChatStore } from './chat-store.js';
import {
  sendMsg,
  buildSessionInitMsg,
  buildChatListMsg,
  getVersions,
  sortChatsByRecent,
  formatError,
} from './utils/ws-helpers.js';

/** Mutable server-side session state shared across handlers. */
export interface SessionState {
  activeChatId: string | null;
  activeVersionStore: VersionStore | null;
  latestDocument: LearningDocument | null;
}

export interface HandlerDeps {
  state: SessionState;
  chatStore: ChatStore;
  broadcast: (msg: WsMessage) => void;
  switchToChat: (chatId: string) => Promise<void>;
  docService?: DocumentService;
  getProviders?: () => import('../shared/providers.js').ProviderInfo[];
  onPrompt?: typeof handlePrompt;
}

/** Route a parsed client message to the appropriate handler. */
export async function routeMessage(
  ws: WebSocket,
  msg: ClientMessage,
  deps: HandlerDeps,
): Promise<void> {
  const { state, chatStore, broadcast, switchToChat } = deps;
  const docService = deps.docService ?? createDocumentService();
  const getProviders = deps.getProviders ?? listProviders;
  const promptHandler = deps.onPrompt ?? handlePrompt;

  switch (msg.type) {
    case 'list-chats': {
      sendMsg(ws, buildChatListMsg(chatStore.listChats(), state.activeChatId));
      return;
    }

    case 'new-chat': {
      const chat = chatStore.createChat();
      await chatStore.save();
      await switchToChat(chat.id);

      broadcast(buildChatListMsg(chatStore.listChats(), chat.id));

      sendMsg(ws, buildSessionInitMsg({
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

      const versions = await getVersions(state.activeVersionStore);
      broadcast(buildSessionInitMsg({
        sessionDir: chatStore.getChatDir(msg.chatId),
        document: state.latestDocument,
        versions,
        chats: chatStore.listChats(),
        activeChatId: msg.chatId,
      }));
      return;
    }

    case 'delete-chat': {
      const wasActive = msg.chatId === state.activeChatId;
      await chatStore.deleteChat(msg.chatId);

      if (wasActive) {
        const remaining = chatStore.listChats();
        if (remaining.length > 0) {
          await switchToChat(sortChatsByRecent(remaining)[0].id);
        } else {
          const newChat = chatStore.createChat();
          await chatStore.save();
          await switchToChat(newChat.id);
        }

        const versions = await getVersions(state.activeVersionStore);
        broadcast(buildSessionInitMsg({
          sessionDir: state.activeChatId
            ? chatStore.getChatDir(state.activeChatId)
            : '',
          document: state.latestDocument,
          versions,
          chats: chatStore.listChats(),
          activeChatId: state.activeChatId,
        }));
      } else {
        broadcast(buildChatListMsg(chatStore.listChats(), state.activeChatId));
      }
      return;
    }

    case 'select-version': {
      if (!state.activeVersionStore) return;

      const versionContent = await state.activeVersionStore.getVersion(msg.version);
      const { parse } = await import('./markdown.js');
      const doc = parse(versionContent);
      const versionList = await state.activeVersionStore.listVersions();

      sendMsg(ws, {
        type: 'version-change',
        document: doc,
        version: msg.version,
        versions: versionList,
      });
      return;
    }

    case 'select-section': {
      if (!state.activeChatId) return;
      const filePath = docService.filePath(chatStore.getChatDir(state.activeChatId));
      const doc = docService.read(filePath);
      if (!doc) return;

      docService.applyTool(filePath, 'set_active', { section: msg.sectionId });
      return;
    }

    case 'prompt': {
      const { provider: providerId, model: modelId, reasoningEffort, text } = msg;
      const from = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
      console.log(`[prompt]${from} "${text}" provider=${providerId ?? 'none'} model=${modelId ?? 'none'} effort=${reasoningEffort ?? 'default'}`);

      if (!providerId || !modelId) {
        console.log('  No provider/model selected — waiting for REPL to call MCP tools');
        return;
      }

      if (!state.activeChatId || !state.activeVersionStore) {
        sendMsg(ws, { type: 'provider-error', error: 'No active chat' });
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
        });
        state.latestDocument = result.updatedDocument;
      } catch (err) {
        console.error('Provider error:', err);
        broadcast({ type: 'provider-error', error: formatError(err) });
      }
      return;
    }

    case 'get-providers': {
      sendMsg(ws, { type: 'provider-list', providers: getProviders() });
      return;
    }
  }
}
