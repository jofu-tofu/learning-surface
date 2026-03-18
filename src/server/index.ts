import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { createChatStore } from './chat-store.js';
import { createDocumentService } from './document-service.js';
import { listProvidersWithStatus } from './providers/registry.js';
import { routeMessage, type SessionState } from './ws-handlers.js';
import {
  sendMessage,
  buildSessionInitMessage,
  getVersions,
  ensureActiveChat,
  formatError,
} from './utils/ws-helpers.js';
import type { ClientMessage, WsMessage, VersionStore } from '../shared/types.js';
import { createChatLogger, nullLogger } from './logger.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStatic(clientDir: string, req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? '/';
  const pathname = url.split('?')[0];

  // Try the exact path, then fall back to index.html (SPA routing)
  let filePath = join(clientDir, pathname === '/' ? 'index.html' : pathname);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(clientDir, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const body = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(body);
}

export async function startServer(options: {
  sessionDir: string;
  port: number;
  clientDir?: string;
}): Promise<void> {
  const { sessionDir, port, clientDir } = options;

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

  // HTTP server — serves static files in production, 404 in dev (Vite handles it)
  const httpServer = createServer((req, res) => {
    if (clientDir && existsSync(clientDir)) {
      serveStatic(clientDir, req, res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Learning Surface server (frontend served by Vite in dev mode)');
    }
  });

  const webSocketServer = new WebSocketServer({ server: httpServer });
  webSocketServer.on('error', () => {}); // handled by httpServer 'error' listener

  function broadcast(message: WsMessage): void {
    const serializedMessage = JSON.stringify(message);
    for (const client of webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    }
  }

  let switchLock = Promise.resolve();

  async function switchToChat(chatId: string): Promise<void> {
    const op = switchLock.then(async () => {
      watcher.stop();
      state.activeChatId = chatId;
      state.activeVersionStore = await initVersionStoreForChat(chatId);

      const chatDir = chatStore.getChatDir(chatId);
      state.latestDocument = documentService.read(documentService.filePath(chatDir));

      const log = createChatLogger(chatDir);
      log.info('Chat activated', { chatId });

      watcher.start(chatDir);
    });
    switchLock = op.catch((err) => console.error('switchToChat failed', { error: formatError(err) }));
    return op;
  }

  watcher.onDocumentChange(async (doc) => {
    state.latestDocument = doc;

    // Set chat title from the first version's summary (root ancestor names the chat)
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

  webSocketServer.on('connection', async (ws) => {
    if (!state.activeChatId) {
      await ensureActiveChat(chatStore, switchToChat);
    }

    const [versions, providers] = await Promise.all([
      getVersions(state.activeVersionStore),
      listProvidersWithStatus(),
    ]);
    sendMessage(ws, buildSessionInitMessage({
      sessionDir: state.activeChatId ? chatStore.getChatDir(state.activeChatId) : sessionDir,
      document: state.latestDocument,
      versions,
      chats: chatStore.listChats(),
      activeChatId: state.activeChatId,
      providers,
    }));

    ws.on('message', async (rawMessage) => {
      try {
        const clientMessage = JSON.parse(String(rawMessage)) as ClientMessage;
        await routeMessage(ws, clientMessage, { state, chatStore, broadcast, switchToChat });
      } catch (err) {
        const chatDir = state.activeChatId ? chatStore.getChatDir(state.activeChatId) : null;
        const log = chatDir ? createChatLogger(chatDir) : nullLogger;
        log.error('Error handling client message', { error: formatError(err) });
      }
    });
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Kill the other process or use a different port.`);
    } else {
      console.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  httpServer.listen(port, async () => {
    console.log(`Learning Surface running on http://localhost:${port}`);
    console.log(`Data directory: ${sessionDir}`);
    if (clientDir && existsSync(clientDir)) {
      console.log(`Serving frontend from: ${clientDir}`);
    }
    const providerStatuses = await listProvidersWithStatus();
    for (const p of providerStatuses) {
      const icon = p.status?.available ? '+' : '-';
      const detail = p.status?.available ? '' : ` (${p.status?.error ?? 'unknown'})`;
      console.log(`  [${icon}] ${p.name} (${p.type})${detail}`);
    }
  });

  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      watcher.stop();
      for (const client of webSocketServer.clients) {
        client.terminate();
      }
      webSocketServer.close();
      httpServer.close(() => {
        resolve();
        process.exit(0);
      });
      // Force exit if cleanup takes too long
      setTimeout(() => {
        process.exit(0);
      }, 3000).unref();
    });
  });
}
