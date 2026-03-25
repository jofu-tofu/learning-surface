import type { WebSocket } from 'ws';
import { createDocumentService, type DocumentService } from './document-service.js';
import { handlePrompt } from './prompt-handler.js';
import { parseSurface } from './surface-file.js';
import { getProvider as getProviderFromRegistry, listProviders } from './providers/registry.js';
import type { LearningDocument } from '../shared/document.js';
import type { ClientMessage, WsMessage } from '../shared/messages.js';
import type { VersionStore } from './types.js';
import type { ChatStore } from './chat-store.js';
import {
  sendMessage,
  buildSessionInitMessage,
  buildChatListMessage,
  getVersions,
  ensureActiveChat,
  formatError,
} from './utils/ws-helpers.js';
import { createChatLogger, nullLogger } from './logger.js';

/** Mutable server-side session state shared across handlers. */
export interface SessionState {
  activeChatId: string | null;
  activeVersionStore: VersionStore | null;
  latestDocument: LearningDocument | null;
  /** Last provider/model used, for auto-triggering feedback after response submission. */
  lastProvider?: string;
  lastModel?: string;
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

/** Create a new chat and switch to it.  Returns the new chat ID. */
async function createChat(
  deps: Pick<HandlerDeps, 'chatStore' | 'switchToChat'>,
): Promise<string> {
  const { chatStore, switchToChat } = deps;
  const chat = chatStore.createChat();
  await chatStore.save();
  await switchToChat(chat.id);
  return chat.id;
}

/** Create a new chat, switch to it, and broadcast the updated state. */
async function createAndInitChat(
  ws: WebSocket,
  deps: Pick<HandlerDeps, 'chatStore' | 'switchToChat' | 'broadcast'>,
): Promise<void> {
  const { chatStore, broadcast } = deps;
  const chatId = await createChat(deps);

  broadcast(buildChatListMessage(chatStore.listChats(), chatId));

  sendMessage(ws, buildSessionInitMessage({
    sessionDir: chatStore.getChatDir(chatId),
    versions: [],
    chats: chatStore.listChats(),
    activeChatId: chatId,
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
      await createAndInitChat(ws, deps);
      return;
    }

    case 'new-chat-with-prompt': {
      // Create the chat but DON'T send session-init (which resets isProcessing).
      // Only broadcast chat-list so the sidebar updates while the prompt processes.
      const chatId = await createChat(deps);
      broadcast(buildChatListMessage(chatStore.listChats(), chatId));

      // Then process the prompt in the new chat
      const promptMsg: ClientMessage = {
        type: 'prompt',
        text: msg.text,
        provider: msg.provider,
        model: msg.model,
        reasoningEffort: msg.reasoningEffort,
        fromVersion: msg.fromVersion,
      };
      await routeMessage(ws, promptMsg, deps);
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
        // If no chats remain, ensureActiveChat was a no-op — clear state
        if (chatStore.listChats().length === 0) {
          state.activeChatId = null;
          state.activeVersionStore = null;
          state.latestDocument = null;
        }

        await broadcastSessionState({ state, chatStore, broadcast });
      } else {
        broadcast(buildChatListMessage(chatStore.listChats(), state.activeChatId));
      }
      return;
    }

    case 'delete-chats': {
      if (msg.chatIds.length === 0) return;

      const wasActiveDeleted = msg.chatIds.includes(state.activeChatId ?? '');
      for (const chatId of msg.chatIds) {
        await chatStore.deleteChat(chatId);
      }

      if (wasActiveDeleted) {
        await ensureActiveChat(chatStore, switchToChat);
        if (chatStore.listChats().length === 0) {
          state.activeChatId = null;
          state.activeVersionStore = null;
          state.latestDocument = null;
        }
        await broadcastSessionState({ state, chatStore, broadcast });
      } else {
        broadcast(buildChatListMessage(chatStore.listChats(), state.activeChatId));
      }
      return;
    }

    case 'rename-chat': {
      const chat = chatStore.getChat(msg.chatId);
      if (!chat) return;

      await chatStore.updateChatTitle(msg.chatId, msg.title);
      broadcast(buildChatListMessage(chatStore.listChats(), state.activeChatId));
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

    case 'prompt': {
      const { provider: providerId, model: modelId, reasoningEffort, text } = msg;

      const chatDir = state.activeChatId ? chatStore.getChatDir(state.activeChatId) : null;
      const log = chatDir ? createChatLogger(chatDir) : nullLogger;

      const versionLogSuffix = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
      log.info(`Prompt received${versionLogSuffix}`, { text, providerId: providerId ?? 'none', modelId: modelId ?? 'none', reasoningEffort: reasoningEffort ?? 'default' });

      // Track provider/model for auto-triggering feedback after response submission
      if (providerId) state.lastProvider = providerId;
      if (modelId) state.lastModel = modelId;

      if (!providerId || !modelId) {
        log.info('No provider/model selected — waiting for REPL to call MCP tools');
        return;
      }

      if (!state.activeChatId || !state.activeVersionStore) {
        sendMessage(ws, { type: 'provider-error', error: 'No active chat' });
        return;
      }

      try {
        const result = await promptHandler({
          text,
          providerId,
          modelId,
          reasoningEffort,
          chatDir: chatDir!,
          latestDocument: state.latestDocument,
          versionStore: state.activeVersionStore,
          onProgress(toolName, step) {
            broadcast({ type: 'tool-progress', toolName, step });
          },
        });
        state.latestDocument = result.updatedDocument;
        sendMessage(ws, { type: 'prompt-complete' });
      } catch (err) {
        const errorMessage = formatError(err);
        log.error('Provider error', { error: errorMessage, providerId, modelId, text });
        broadcast({ type: 'provider-error', error: errorMessage });
      }
      return;
    }

    case 'submit-responses': {
      if (!state.activeChatId || !state.activeVersionStore) {
        sendMessage(ws, { type: 'provider-error', error: 'No active chat' });
        return;
      }

      const chatDir = chatStore.getChatDir(state.activeChatId);
      const log = createChatLogger(chatDir);
      const filePath = documentService.filePath(chatDir);
      const doc = documentService.read(filePath);
      if (!doc) {
        sendMessage(ws, { type: 'provider-error', error: 'No document found' });
        return;
      }

      // Write learner responses into matching interactive blocks
      for (const block of doc.blocks) {
        if (block.type === 'interactive' && msg.responses[block.id] !== undefined) {
          block.response = msg.responses[block.id];
        }
      }

      // Bump version and write
      doc.version++;
      documentService.write(filePath, doc);

      // Create a version snapshot with source: 'learner'
      const content = documentService.readRaw(filePath) ?? '';
      await state.activeVersionStore.createVersion(content, {
        prompt: null,
        summary: 'Responses submitted',
        timestamp: new Date().toISOString(),
        source: 'learner',
        changedPanes: ['blocks'],
      });

      state.latestDocument = doc;
      log.info('Responses submitted', { responses: msg.responses });

      // Re-write to trigger watcher with updated version list
      documentService.write(filePath, doc);

      // Auto-trigger AI feedback if we have a provider
      if (state.lastProvider && state.lastModel) {
        const feedbackMsg: ClientMessage = {
          type: 'prompt',
          text: 'Respond to the learner\'s answers',
          provider: state.lastProvider,
          model: state.lastModel,
        };
        await routeMessage(ws, feedbackMsg, deps);
      } else {
        // No provider available to auto-trigger — notify client that processing is done
        sendMessage(ws, { type: 'prompt-complete' });
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
