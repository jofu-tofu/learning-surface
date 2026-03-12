import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import envPaths from 'env-paths';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { createChatStore } from './chat-store.js';
import { createContextCompiler } from './context.js';
import { parse, serialize, applyToolCall } from './markdown.js';
import { BLANK_DOC } from './document-service.js';
import { TOOL_DEFS, zodToJsonSchema } from '../shared/schemas.js';
import { getProvider, listProviders } from './providers/registry.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import type { ToolDefinition } from '../shared/providers.js';
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

  // Context compiler for building AI system prompts
  const contextCompiler = createContextCompiler();

  // Convert MCP tool defs to provider tool definitions (done once)
  const providerTools: ToolDefinition[] = TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    parameters: zodToJsonSchema(def.schema),
  }));

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

    // Send current state: chat list + active chat's document + versions + providers
    const versions = activeVersionStore ? await activeVersionStore.listVersions() : [];
    const initMsg: WsMessage = {
      type: 'session-init',
      sessionDir: activeChatId ? chatStore.getChatDir(activeChatId) : sessionDir,
      document: latestDocument ?? undefined,
      versions,
      chats: chatStore.listChats(),
      activeChatId: activeChatId ?? undefined,
      providers: listProviders(),
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
          const providerId = msg.provider as string | undefined;
          const modelId = msg.model as string | undefined;
          const from = msg.fromVersion ? ` (from v${msg.fromVersion})` : '';
          console.log(`[prompt]${from} "${msg.text}" provider=${providerId ?? 'none'} model=${modelId ?? 'none'}`);

          if (!providerId || !modelId) {
            console.log('  No provider/model selected — waiting for REPL to call MCP tools');
            return;
          }

          const provider = getProvider(providerId);
          if (!provider) {
            const errMsg: WsMessage = { type: 'provider-error', error: `Unknown provider: ${providerId}` };
            ws.send(JSON.stringify(errMsg));
            return;
          }

          const filePath = getCurrentFilePath();
          if (!filePath || !activeChatId) {
            const errMsg: WsMessage = { type: 'provider-error', error: 'No active chat' };
            ws.send(JSON.stringify(errMsg));
            return;
          }

          // Ensure current.md exists with a blank document
          if (!existsSync(filePath)) {
            const blankDoc = { ...BLANK_DOC, sections: [...BLANK_DOC.sections] };
            writeFileSync(filePath, serialize(blankDoc), 'utf-8');
            latestDocument = blankDoc;
          }

          // Build context-aware system prompt
          const chatDir = chatStore.getChatDir(activeChatId);
          const currentDoc = latestDocument ?? parse(readFileSync(filePath, 'utf-8'));
          const context = await contextCompiler.compile(currentDoc, chatDir);
          const systemPrompt = SYSTEM_PROMPT + JSON.stringify(context, null, 2);

          // Track the version before this batch of tool calls
          const startVersion = currentDoc.version;

          // Call the AI provider
          try {
            await provider.complete({
              prompt: msg.text,
              systemPrompt,
              tools: providerTools,
              model: modelId,
              sessionDir: chatDir,
              async onToolCall(call) {
                // Read the latest document from disk (may have been updated by previous tool calls)
                const raw = readFileSync(filePath, 'utf-8');
                const doc = parse(raw);

                // Apply the tool call
                const updated = applyToolCall(doc, call.tool, call.params);
                updated.version = startVersion + 1;

                // Write back — the file watcher will broadcast the update
                writeFileSync(filePath, serialize(updated), 'utf-8');

                return {
                  success: true,
                  message: `Applied ${call.tool} → version ${updated.version}`,
                };
              },
            });

            // Create a version snapshot after the AI finishes
            if (activeVersionStore) {
              const finalContent = readFileSync(filePath, 'utf-8');
              const finalDoc = parse(finalContent);
              if (finalDoc.version > startVersion) {
                await activeVersionStore.createVersion(finalContent, {
                  prompt: msg.text,
                  summary: finalDoc.summary ?? null,
                  timestamp: new Date().toISOString(),
                  source: 'ai',
                });
                // Re-write to trigger watcher with updated version list
                writeFileSync(filePath, finalContent, 'utf-8');
              }
            }
          } catch (err) {
            console.error('Provider error:', err);
            const errMsg: WsMessage = {
              type: 'provider-error',
              error: err instanceof Error ? err.message : String(err),
            };
            broadcast(errMsg);
          }

        } else if (msg.type === 'get-providers') {
          const reply: WsMessage = { type: 'provider-list', providers: listProviders() };
          ws.send(JSON.stringify(reply));
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
const paths = envPaths('learning-surface', { suffix: '' });
const sessionDir =
  process.argv[2] ||                       // explicit CLI arg
  process.env.LEARNING_SURFACE_DATA ||     // env var override
  (process.env.NODE_ENV === 'production' ? paths.data : './session');
const port = parseInt(process.argv[3] || '8080', 10);

startServer({ sessionDir, port }).catch((err) => {
  console.error('Server failed:', err);
  process.exit(1);
});
