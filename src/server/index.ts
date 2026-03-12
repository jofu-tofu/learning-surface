import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { createChatStore } from './chat-store.js';
import { parse } from './markdown.js';
import { listProviders } from './providers/registry.js';
import { routeMessage, type SessionState } from './ws-handlers.js';
import {
  sendMsg,
  buildSessionInitMsg,
  getVersions,
  sortChatsByRecent,
} from './utils/ws-helpers.js';
import type { ClientMessage, WsMessage, VersionStore } from '../shared/types.js';

export async function startServer(options: {
  sessionDir: string;
  port: number;
}): Promise<void> {
  const { sessionDir, port } = options;

  const chatStore = createChatStore();
  await chatStore.init(sessionDir);

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

  const wss = new WebSocketServer({ port });

  function broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  async function switchToChat(chatId: string): Promise<void> {
    watcher.stop();
    state.activeChatId = chatId;
    state.activeVersionStore = await initVersionStoreForChat(chatId);

    const chatDir = chatStore.getChatDir(chatId);
    const filePath = join(chatDir, 'current.md');

    if (existsSync(filePath)) {
      try {
        state.latestDocument = parse(readFileSync(filePath, 'utf-8'));
      } catch {
        state.latestDocument = null;
      }
    } else {
      state.latestDocument = null;
    }

    watcher.start(chatDir);
  }

  watcher.onDocumentChange(async (doc) => {
    state.latestDocument = doc;

    // Update chat title from first version's summary
    if (state.activeChatId && doc.summary) {
      const chat = chatStore.getChat(state.activeChatId);
      if (chat && chat.title === 'New Chat') {
        await chatStore.updateChatTitle(state.activeChatId, doc.summary);
        broadcast({ type: 'chat-list', chats: chatStore.listChats(), activeChatId: state.activeChatId });
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

  wss.on('connection', async (ws) => {
    if (!state.activeChatId) {
      const chats = chatStore.listChats();
      if (chats.length > 0) {
        await switchToChat(sortChatsByRecent(chats)[0].id);
      } else {
        const chat = chatStore.createChat();
        await chatStore.save();
        await switchToChat(chat.id);
      }
    }

    const versions = await getVersions(state.activeVersionStore);
    sendMsg(ws, buildSessionInitMsg({
      sessionDir: state.activeChatId ? chatStore.getChatDir(state.activeChatId) : sessionDir,
      document: state.latestDocument,
      versions,
      chats: chatStore.listChats(),
      activeChatId: state.activeChatId,
      providers: listProviders(),
    }));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as ClientMessage;
        await routeMessage(ws, msg, { state, chatStore, broadcast, switchToChat });
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
      wss.close();
      resolve();
    });
  });
}
