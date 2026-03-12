import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { createChatStore } from './chat-store.js';
import { parse, serialize, applyToolCall } from './markdown.js';
import type { LearningDocument, WsMessage, VersionStore } from '../shared/types.js';

export async function startServer(options: {
  sessionDir: string;
  port: number;
}): Promise<void> {
  const { sessionDir, port } = options;

  // Initialize chat store (uses sessionDir as the data root)
  const chatStore = createChatStore();
  await chatStore.init(sessionDir);

  // Active chat state
  let activeChatId: string | null = null;
  let activeVersionStore: VersionStore | null = null;
  let latestDocument: LearningDocument | null = null;

  // File watcher — set up once, re-pointed when switching chats
  const watcher = createFileWatcher();

  async function initVersionStoreForChat(chatId: string): Promise<VersionStore> {
    const dir = chatStore.getChatDir(chatId);
    const store = createVersionStore();
    await store.init(dir);
    return store;
  }

  function getCurrentFilePath(): string | null {
    if (!activeChatId) return null;
    return join(chatStore.getChatDir(activeChatId), 'current.md');
  }

  // Set up WebSocket server
  const wss = new WebSocketServer({ port });

  function broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  watcher.onDocumentChange(async (doc) => {
    latestDocument = doc;

    // Update chat title from first version's summary
    if (activeChatId && doc.summary) {
      const chat = chatStore.getChat(activeChatId);
      if (chat && chat.title === 'New Chat') {
        await chatStore.updateChatTitle(activeChatId, doc.summary);
        broadcast({ type: 'chat-list', chats: chatStore.listChats(), activeChatId });
      }
    }

    // Just broadcast the live document state — versions are created by the MCP server,
    // not the file watcher. Re-read versions from disk so the UI stays in sync.
    if (activeVersionStore) {
      const versions = await activeVersionStore.listVersions();
      broadcast({ type: 'document-update', document: doc, versions });
    }
  });

  watcher.onVersionChange((version) => {
    broadcast({ type: 'version-change', version });
  });

  async function switchToChat(chatId: string): Promise<void> {
    // Stop watching old chat
    watcher.stop();

    activeChatId = chatId;
    activeVersionStore = await initVersionStoreForChat(chatId);

    const chatDir = chatStore.getChatDir(chatId);
    const filePath = join(chatDir, 'current.md');

    // Load current document if it exists
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        latestDocument = parse(raw);
      } catch {
        latestDocument = null;
      }
    } else {
      latestDocument = null;
    }

    // Start watching new chat dir
    watcher.start(chatDir);
  }

  // Handle client connections and messages
  wss.on('connection', async (ws) => {
    // If no active chat, create one
    if (!activeChatId) {
      const chats = chatStore.listChats();
      if (chats.length > 0) {
        // Resume most recently updated chat
        const sorted = [...chats].sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        await switchToChat(sorted[0].id);
      } else {
        const chat = chatStore.createChat();
        await chatStore.save();
        await switchToChat(chat.id);
      }
    }

    // Send current state: chat list + active chat's document + versions
    const versions = activeVersionStore ? await activeVersionStore.listVersions() : [];
    const initMsg: WsMessage = {
      type: 'session-init',
      sessionDir: activeChatId ? chatStore.getChatDir(activeChatId) : sessionDir,
      document: latestDocument ?? undefined,
      versions,
      chats: chatStore.listChats(),
      activeChatId: activeChatId ?? undefined,
    };
    ws.send(JSON.stringify(initMsg));

    // Handle incoming messages from the frontend
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw));

        if (msg.type === 'list-chats') {
          const reply: WsMessage = {
            type: 'chat-list',
            chats: chatStore.listChats(),
            activeChatId: activeChatId ?? undefined,
          };
          ws.send(JSON.stringify(reply));

        } else if (msg.type === 'new-chat') {
          const chat = chatStore.createChat();
          await chatStore.save();
          await switchToChat(chat.id);

          // Broadcast updated chat list to all clients
          broadcast({ type: 'chat-list', chats: chatStore.listChats(), activeChatId: chat.id });

          // Send session-init to the requesting client
          const initReply: WsMessage = {
            type: 'session-init',
            sessionDir: chatStore.getChatDir(chat.id),
            document: undefined,
            versions: [],
            chats: chatStore.listChats(),
            activeChatId: chat.id,
          };
          ws.send(JSON.stringify(initReply));

        } else if (msg.type === 'switch-chat') {
          const chatId = msg.chatId as string;
          const chat = chatStore.getChat(chatId);
          if (!chat) return;

          await switchToChat(chatId);

          const versions = activeVersionStore ? await activeVersionStore.listVersions() : [];
          const reply: WsMessage = {
            type: 'session-init',
            sessionDir: chatStore.getChatDir(chatId),
            document: latestDocument ?? undefined,
            versions,
            chats: chatStore.listChats(),
            activeChatId: chatId,
          };
          broadcast(reply);

        } else if (msg.type === 'delete-chat') {
          const chatId = msg.chatId as string;
          const wasActive = chatId === activeChatId;

          await chatStore.deleteChat(chatId);

          if (wasActive) {
            // Switch to another chat or create a new one
            const remaining = chatStore.listChats();
            if (remaining.length > 0) {
              const sorted = [...remaining].sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
              await switchToChat(sorted[0].id);
            } else {
              const newChat = chatStore.createChat();
              await chatStore.save();
              await switchToChat(newChat.id);
            }

            const versions = activeVersionStore ? await activeVersionStore.listVersions() : [];
            const reply: WsMessage = {
              type: 'session-init',
              sessionDir: activeChatId ? chatStore.getChatDir(activeChatId) : sessionDir,
              document: latestDocument ?? undefined,
              versions,
              chats: chatStore.listChats(),
              activeChatId: activeChatId ?? undefined,
            };
            broadcast(reply);
          } else {
            broadcast({ type: 'chat-list', chats: chatStore.listChats(), activeChatId: activeChatId ?? undefined });
          }

        } else if (msg.type === 'select-version') {
          if (!activeVersionStore) return;
          // Reconstruct document at the requested version and send it back
          const versionContent = await activeVersionStore.getVersion(msg.version);
          const doc = parse(versionContent);
          const versionList = await activeVersionStore.listVersions();
          const reply: WsMessage = {
            type: 'version-change',
            document: doc,
            version: msg.version,
            versions: versionList,
          };
          ws.send(JSON.stringify(reply));

        } else if (msg.type === 'select-section') {
          const filePath = getCurrentFilePath();
          if (!filePath || !existsSync(filePath)) return;
          // Update active section in the document
          const content = readFileSync(filePath, 'utf-8');
          const doc = parse(content);
          const updated = applyToolCall(doc, 'set_active', { section: msg.sectionId });
          writeFileSync(filePath, serialize(updated), 'utf-8');

        } else if (msg.type === 'prompt') {
          const from = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
          console.log(`[prompt]${from} "${msg.text}" — waiting for REPL to call MCP tools`);
        }
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });
  });

  console.log(`Learning Surface server running on ws://localhost:${port}`);
  console.log(`Data directory: ${sessionDir}`);

  // Keep process alive
  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      watcher.stop();
      wss.close();
      resolve();
    });
  });
}

// CLI entry point
const sessionDir = process.argv[2] || './session';
const port = parseInt(process.argv[3] || '8080', 10);

startServer({ sessionDir, port }).catch((err) => {
  console.error('Server failed:', err);
  process.exit(1);
});
