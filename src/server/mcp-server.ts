import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../shared/schemas.js';
import { parse, serialize, applyToolCall } from './markdown.js';
import type { VersionStore } from '../shared/types.js';

const DEFAULT_DEBOUNCE_MS = 2000;

// --- Factory ---

export function createMcpServer(options: {
  sessionDir: string;
  versionStore?: VersionStore;
  debounceMs?: number;
  transport?: Transport;
}): { start(): Promise<void>; stop(): Promise<void>; flushVersionBatch(): Promise<void> } {
  const { sessionDir, versionStore, debounceMs = DEFAULT_DEBOUNCE_MS, transport: injectedTransport } = options;

  if (!versionStore) {
    throw new Error('versionStore is required');
  }
  const store = versionStore;

  // --- Batch versioning state ---
  let batchStartVersion: number | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function flushVersionBatch(): Promise<void> {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (batchStartVersion === null) return;

    const filePath = join(sessionDir, 'current.md');
    const content = readFileSync(filePath, 'utf-8');
    const doc = parse(content);

    await store.createVersion(content, {
      prompt: null,
      summary: doc.summary ?? null,
      timestamp: new Date().toISOString(),
      source: 'ai',
    });

    batchStartVersion = null;

    // Re-write current.md to trigger the file watcher so the UI picks up the new version
    writeFileSync(filePath, content, 'utf-8');
  }

  const server = new Server(
    { name: 'learning-surface', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Register list-tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFS.map((def) => ({
      name: def.name,
      description: def.description,
      inputSchema: zodToJsonSchema(def.schema),
    })),
  }));

  // Register call-tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const schemaDef = toolSchemaMap.get(name);
    if (!schemaDef) {
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Validate params
    const parsed = schemaDef.safeParse(args);
    if (!parsed.success) {
      return {
        content: [
          { type: 'text' as const, text: `Invalid params: ${parsed.error.message}` },
        ],
        isError: true,
      };
    }

    try {
      // Read current document
      const filePath = join(sessionDir, 'current.md');
      const raw = readFileSync(filePath, 'utf-8');
      const doc = parse(raw);

      // Start a new batch if not already in one
      if (batchStartVersion === null) {
        batchStartVersion = doc.version;
      }

      // Apply tool call — all calls in a batch share the same target version
      const updated = applyToolCall(doc, name, parsed.data as Record<string, unknown>);
      updated.version = batchStartVersion + 1;

      // Write back (triggers file watcher for live UI updates)
      const serialized = serialize(updated);
      writeFileSync(filePath, serialized, 'utf-8');

      // Reset debounce timer — version is created only after the batch settles
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { flushVersionBatch(); }, debounceMs);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Applied ${name} → version ${updated.version}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error applying ${name}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return {
    async start() {
      const transport = injectedTransport ?? new StdioServerTransport();
      await server.connect(transport);
    },
    async stop() {
      // Flush any pending batch before shutting down
      await flushVersionBatch();
      await server.close();
    },
    flushVersionBatch,
  };
}
