import type { WebSocket } from 'ws';
import { createDocumentService, type DocumentService } from './document-service.js';
import { handlePrompt } from './prompt-handler.js';
import { parseSurface } from './surface-file.js';
import { getProvider as getProviderFromRegistry, listProviders } from './providers/registry.js';
import type { ClientMessage } from '../shared/messages.js';
import type { ChatStore } from './chat-store.js';
import type { SessionBus } from './session-bus.js';
import { sendMessage, buildChatListMessage, formatError } from './utils/ws-helpers.js';
import { createChatLogger, nullLogger } from './logger.js';

// ── Handler dependencies ────────────────────────────────────────────

export interface HandlerDeps {
  bus: SessionBus;
  chatStore: ChatStore;
  documentService?: DocumentService;
  getProviders?: () => import('../shared/providers.js').ProviderInfo[];
  getProvider?: (id: string) => import('../shared/providers.js').Agent | undefined;
  onPrompt?: typeof handlePrompt;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Create a new chat and switch to it. Returns the new chat ID. */
async function createChat(
  deps: Pick<HandlerDeps, 'chatStore' | 'bus'>,
): Promise<string> {
  const { chatStore, bus } = deps;
  const chat = chatStore.createChat();
  await chatStore.save();
  await bus.switchToChat(chat.id);
  return chat.id;
}

// ── Router ──────────────────────────────────────────────────────────

/** Route a parsed client message to the appropriate handler. */
export async function routeMessage(
  ws: WebSocket,
  msg: ClientMessage,
  deps: HandlerDeps,
): Promise<void> {
  const { bus, chatStore } = deps;
  const documentService = deps.documentService ?? createDocumentService();
  const getProviders = deps.getProviders ?? listProviders;
  const providerLookup = deps.getProvider ?? getProviderFromRegistry;
  const promptHandler = deps.onPrompt ?? handlePrompt;

  switch (msg.type) {
    case 'list-chats': {
      sendMessage(ws, buildChatListMessage(chatStore.listChats(), bus.activeChatId));
      return;
    }

    case 'new-chat': {
      await createChat(deps);
      bus.chatListChanged();
      sendMessage(ws, await bus.buildSessionInit());
      return;
    }

    case 'new-chat-with-prompt': {
      // Create the chat but DON'T send session-init (which resets isProcessing).
      // Only broadcast chat-list so the sidebar updates while the prompt processes.
      await createChat(deps);
      bus.chatListChanged();

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

      await bus.switchToChat(msg.chatId);
      await bus.broadcastFullState();
      return;
    }

    case 'delete-chat': {
      const wasActive = msg.chatId === bus.activeChatId;
      await chatStore.deleteChat(msg.chatId);

      if (wasActive) {
        await bus.ensureActiveChat();
        await bus.broadcastFullState();
      } else {
        bus.chatListChanged();
      }
      return;
    }

    case 'delete-chats': {
      if (msg.chatIds.length === 0) return;

      const wasActiveDeleted = msg.chatIds.includes(bus.activeChatId ?? '');
      for (const chatId of msg.chatIds) {
        await chatStore.deleteChat(chatId);
      }

      if (wasActiveDeleted) {
        await bus.ensureActiveChat();
        await bus.broadcastFullState();
      } else {
        bus.chatListChanged();
      }
      return;
    }

    case 'rename-chat': {
      const chat = chatStore.getChat(msg.chatId);
      if (!chat) return;

      await chatStore.updateChatTitle(msg.chatId, msg.title);
      bus.chatListChanged();
      return;
    }

    case 'select-version': {
      if (!bus.activeVersionStore) return;

      const versionContent = await bus.activeVersionStore.getVersion(msg.version);
      const doc = parseSurface(versionContent);
      const versionList = await bus.activeVersionStore.listVersions();

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

      const chatDir = bus.activeChatId ? chatStore.getChatDir(bus.activeChatId) : null;
      const log = chatDir ? createChatLogger(chatDir) : nullLogger;

      const versionLogSuffix = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
      log.info(`Prompt received${versionLogSuffix}`, { text, providerId: providerId ?? 'none', modelId: modelId ?? 'none', reasoningEffort: reasoningEffort ?? 'default' });

      // Track provider/model for auto-triggering feedback after response submission
      if (providerId) bus.lastProvider = providerId;
      if (modelId) bus.lastModel = modelId;

      if (!providerId || !modelId) {
        log.info('No provider/model selected — waiting for REPL to call MCP tools');
        return;
      }

      if (!bus.activeChatId || !bus.activeVersionStore) {
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
          latestDocument: bus.latestDocument,
          versionStore: bus.activeVersionStore,
          onProgress(toolName, step) {
            bus.toolProgress(toolName, step);
          },
        });

        await bus.completedWithDocument(result.updatedDocument);
        sendMessage(ws, { type: 'prompt-complete' });
      } catch (err) {
        const errorMessage = formatError(err);
        log.error('Provider error', { error: errorMessage, providerId, modelId, text });
        bus.providerError(errorMessage);
      }
      return;
    }

    case 'submit-responses': {
      if (!bus.activeChatId || !bus.activeVersionStore) {
        sendMessage(ws, { type: 'provider-error', error: 'No active chat' });
        return;
      }

      const chatDir = chatStore.getChatDir(bus.activeChatId);
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
      await bus.activeVersionStore.createVersion(content, {
        prompt: null,
        summary: 'Responses submitted',
        timestamp: new Date().toISOString(),
        source: 'learner',
        changedPanes: ['blocks'],
      });

      log.info('Responses submitted', { responses: msg.responses });
      await bus.completedWithDocument(doc);

      // Auto-trigger AI feedback if we have a provider
      if (bus.lastProvider && bus.lastModel) {
        const feedbackMsg: ClientMessage = {
          type: 'prompt',
          text: 'Respond to the learner\'s answers',
          provider: bus.lastProvider,
          model: bus.lastModel,
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
