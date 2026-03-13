import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../shared/schemas.js';
import type { VersionStore } from '../shared/types.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { buildVersionMeta } from './prompt-handler.js';
import { formatError } from './utils/ws-helpers.js';

const DEFAULT_DEBOUNCE_MS = 2000;

const mcpResponse = (text: string, isError = false) => ({
  content: [{ type: 'text' as const, text }],
  ...(isError && { isError: true as const }),
});

// --- Factory ---

export function createMcpServer(options: {
  sessionDir: string;
  versionStore?: VersionStore;
  debounceMs?: number;
  transport?: Transport;
  docService?: DocumentService;
}): { start(): Promise<void>; stop(): Promise<void>; flushVersionBatch(): Promise<void> } {
  const { sessionDir, versionStore, debounceMs = DEFAULT_DEBOUNCE_MS, transport: injectedTransport } = options;

  if (!versionStore) throw new Error('versionStore is required');
  const store = versionStore;

  const docService = options.docService ?? createDocumentService();
  const filePath = docService.filePath(sessionDir);

  // --- Batch versioning state ---
  let batchStartVersion: number | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function flushVersionBatch(): Promise<void> {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    if (batchStartVersion === null) return;

    const content = docService.readRaw(filePath);
    const doc = docService.read(filePath);
    if (!content || !doc) return;

    await store.createVersion(content, buildVersionMeta(null, doc.summary ?? null, new Date().toISOString()));
    batchStartVersion = null;

    // Re-write current.md to trigger the file watcher so the UI picks up the new version
    docService.write(filePath, doc);
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
    if (!schemaDef) return mcpResponse(`Unknown tool: ${name}`, true);

    // Validate params
    const parsed = schemaDef.safeParse(args);
    if (!parsed.success) return mcpResponse(`Invalid params: ${parsed.error.message}`, true);

    try {
      // Start a new batch if not already in one
      if (batchStartVersion === null) {
        const doc = docService.read(filePath);
        if (doc) batchStartVersion = doc.version;
      }

      // Apply tool call — all calls in a batch share the same target version
      const updated = docService.applyTool(filePath, name, parsed.data as Record<string, unknown>, (batchStartVersion ?? 0) + 1);

      // Reset debounce timer — version is created only after the batch settles
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { flushVersionBatch(); }, debounceMs);

      return mcpResponse(`Applied ${name} → version ${updated.version}`);
    } catch (err) {
      return mcpResponse(`Error applying ${name}: ${formatError(err)}`, true);
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
