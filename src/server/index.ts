import { WebSocket, WebSocketServer } from 'ws';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { createChatStore } from './chat-store.js';
import { createDocumentService } from './document-service.js';
import { listProviders } from './providers/registry.js';
import { routeMessage, type SessionState } from './ws-handlers.js';
import {
  sendMessage,
  buildSessionInitMessage,
  getVersions,
  ensureActiveChat,
} from './utils/ws-helpers.js';
import type { ClientMessage, WsMessage, VersionStore } from '../shared/types.js';

export async function startServer(options: {
  sessionDir: string;
  port: number;
}): Promise<void> {
  const { sessionDir, port } = options;

  const chatStore = createChatStore();
  await chatStore.init(sessionDir);

  const documentService = createDocumentService();

  // Shared mutable session state (passed to routeMessage)
  const state: SessionState = {
    activeChatId: null,
    activeVersionStore: null,
    latestDocument: null,
  };

  const watcher = createFileWatcher();

  async function initVersionStoreForChat(chatId: string): Promise<VersionStore> {
    const dir = chatStore.getChatDir(chatId);
    const store = createVersionStore();
    await store.init(dir);
    return store;
  }

  const webSocketServer = new WebSocketServer({ port });

  function broadcast(message: WsMessage): void {
    const serializedMessage = JSON.stringify(message);
    for (const client of webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    }
  }

  async function switchToChat(chatId: string): Promise<void> {
    watcher.stop();
    state.activeChatId = chatId;
    state.activeVersionStore = await initVersionStoreForChat(chatId);

    const chatDir = chatStore.getChatDir(chatId);
    state.latestDocument = documentService.read(documentService.filePath(chatDir));

    watcher.start(chatDir);
  }

  watcher.onDocumentChange(async (doc) => {
    state.latestDocument = doc;

    // Update chat title from first version's summary
    if (state.activeChatId && doc.summary) {
      const chat = chatStore.getChat(state.activeChatId);
      if (chat && chat.title === 'New Chat') {
        await chatStore.updateChatTitle(state.activeChatId, doc.summary);
        broadcast({ type: 'chat-list', chats: chatStore.listChats(), activeChatId: state.activeChatId ?? undefined });
      }
    }

    if (state.activeVersionStore) {
      const versions = await state.activeVersionStore.listVersions();
      broadcast({ type: 'document-update', document: doc, versions });
    }
  });

  watcher.onVersionChange((version) => {
    broadcast({ type: 'version-change', version });
  });

  webSocketServer.on('connection', async (ws) => {
    if (!state.activeChatId) {
      await ensureActiveChat(chatStore, switchToChat);
    }

    const versions = await getVersions(state.activeVersionStore);
    sendMessage(ws, buildSessionInitMessage({
      sessionDir: state.activeChatId ? chatStore.getChatDir(state.activeChatId) : sessionDir,
      document: state.latestDocument,
      versions,
      chats: chatStore.listChats(),
      activeChatId: state.activeChatId,
      providers: listProviders(),
    }));

    ws.on('message', async (rawMessage) => {
      try {
        const clientMessage = JSON.parse(String(rawMessage)) as ClientMessage;
        await routeMessage(ws, clientMessage, { state, chatStore, broadcast, switchToChat });
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });
  });

  console.log(`Learning Surface server running on ws://localhost:${port}`);
  console.log(`Data directory: ${sessionDir}`);

  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      watcher.stop();
      webSocketServer.close();
      resolve();
    });
  });
}
