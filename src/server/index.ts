import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import { createFileWatcher } from './watcher.js';
import { createVersionStore } from './versions.js';
import { parse, serialize, applyToolCall } from './markdown.js';
import type { LearningDocument, WsMessage } from '../shared/types.js';

export async function startServer(options: {
  sessionDir: string;
  port: number;
}): Promise<void> {
  const { sessionDir, port } = options;

  // Initialize version store
  const versionStore = createVersionStore();
  await versionStore.init(sessionDir);

  // Set up WebSocket server
  const wss = new WebSocketServer({ port });

  let latestDocument: LearningDocument | null = null;

  function broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  // Set up file watcher
  const watcher = createFileWatcher();

  watcher.onDocumentChange(async (doc) => {
    latestDocument = doc;

    // Just broadcast the live document state — versions are created by the MCP server,
    // not the file watcher. Re-read versions from disk so the UI stays in sync.
    const versions = await versionStore.listVersions();
    broadcast({ type: 'document-update', document: doc, versions });
  });

  watcher.onVersionChange((version) => {
    broadcast({ type: 'version-change', version });
  });

  // Handle client connections and messages
  wss.on('connection', async (ws) => {
    // Send current state + version list
    const versions = await versionStore.listVersions();
    const initMsg: WsMessage = {
      type: 'session-init',
      sessionDir,
      document: latestDocument ?? undefined,
      versions,
    };
    ws.send(JSON.stringify(initMsg));

    // Handle incoming messages from the frontend
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        const filePath = join(sessionDir, 'current.md');

        if (msg.type === 'select-version') {
          // Reconstruct document at the requested version and send it back
          const versionContent = await versionStore.getVersion(msg.version);
          const doc = parse(versionContent);
          const versionList = await versionStore.listVersions();
          const reply: WsMessage = {
            type: 'version-change',
            document: doc,
            version: msg.version,
            versions: versionList,
          };
          ws.send(JSON.stringify(reply));
        } else if (msg.type === 'select-section') {
          // Update active section in the document
          const content = readFileSync(filePath, 'utf-8');
          const doc = parse(content);
          const updated = applyToolCall(doc, 'set_active', { section: msg.sectionId });
          writeFileSync(filePath, serialize(updated), 'utf-8');
        } else if (msg.type === 'prompt') {
          console.log(`[prompt] "${msg.text}" — waiting for REPL to call MCP tools`);
        }
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });
  });

  // Start watching
  watcher.start(sessionDir);

  console.log(`Learning Surface server running on ws://localhost:${port}`);
  console.log(`Watching: ${sessionDir}/current.md`);

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
