import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../shared/schemas.js';
import { buildSelectionContext, selectTools } from './tool-selector.js';
import { z } from 'zod';
import type { VersionStore } from '../shared/types.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { buildVersionMeta } from './prompt-handler.js';
import { formatError } from './utils/ws-helpers.js';

const DEFAULT_DEBOUNCE_MS = 2000;

const buildMcpResponse = (text: string, isError = false) => ({
  content: [{ type: 'text' as const, text }],
  ...(isError && { isError: true as const }),
});

// --- Factory ---

export function createMcpServer(options: {
  sessionDir: string;
  versionStore?: VersionStore;
  debounceMs?: number;
  transport?: Transport;
  documentService?: DocumentService;
}): { start(): Promise<void>; stop(): Promise<void>; flushVersionBatch(): Promise<void> } {
  const { sessionDir, versionStore, debounceMs = DEFAULT_DEBOUNCE_MS, transport: injectedTransport } = options;

  if (!versionStore) throw new Error('versionStore is required');
  const store = versionStore;

  const documentService = options.documentService ?? createDocumentService();
  const filePath = documentService.filePath(sessionDir);

  // --- Planning state ---
  let plannedTools: string[] | null = null;

  // --- Batch versioning state ---
  let batchStartVersion: number | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function flushVersionBatch(): Promise<void> {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    if (batchStartVersion === null) return;

    const content = documentService.readRaw(filePath);
    const doc = documentService.read(filePath);
    if (!content || !doc) return;

    await store.createVersion(content, buildVersionMeta(null, doc.summary ?? null, new Date().toISOString()));
    batchStartVersion = null;

    // Reset planning state after batch completes
    if (plannedTools) {
      plannedTools = null;
      await server.notification({ method: 'notifications/tools/list_changed' });
    }

    // Re-write current.md to trigger the file watcher so the UI picks up the new version
    documentService.write(filePath, doc);
  }

  const server = new Server(
    { name: 'learning-surface', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Plan tool schema — accepts an array of tool names
  const PlanToolSchema = z.object({
    tools: z.array(z.string()),
  });

  // Register list-tools handler — returns context-filtered subset (or planned subset)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    if (plannedTools) {
      // After planning: return only the planned tools
      const planned = new Set(plannedTools);
      const defs = TOOL_DEFS.filter(d => planned.has(d.name));
      return {
        tools: defs.map((def) => ({
          name: def.name,
          description: def.description,
          inputSchema: zodToJsonSchema(def.schema),
        })),
      };
    }

    // Before planning: return plan tool + context-filtered tools
    const doc = documentService.read(filePath);
    const ctx = buildSelectionContext(doc);
    const selectedDefs = selectTools(ctx);
    return {
      tools: [
        {
          name: 'plan',
          description: 'Select which tools to use for this response. After calling this, only the selected tools will be available.',
          inputSchema: zodToJsonSchema(PlanToolSchema),
        },
        ...selectedDefs.map((def) => ({
          name: def.name,
          description: def.description,
          inputSchema: zodToJsonSchema(def.schema),
        })),
      ],
    };
  });

  // Register call-tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArguments } = request.params;

    // Handle plan tool — transitions the tool list
    if (name === 'plan') {
      const parsed = PlanToolSchema.safeParse(toolArguments);
      if (!parsed.success) return buildMcpResponse(`Invalid plan params: ${parsed.error.message}`, true);
      const validNames = new Set<string>(TOOL_DEFS.map(d => d.name));
      plannedTools = parsed.data.tools.filter(t => validNames.has(t));
      await server.notification({ method: 'notifications/tools/list_changed' });
      return buildMcpResponse(`Planned ${plannedTools.length} tools: ${plannedTools.join(', ')}`);
    }

    const schemaDef = toolSchemaMap.get(name);
    if (!schemaDef) return buildMcpResponse(`Unknown tool: ${name}`, true);

    // Validate params
    const validatedParams = schemaDef.safeParse(toolArguments);
    if (!validatedParams.success) return buildMcpResponse(`Invalid params: ${validatedParams.error.message}`, true);

    try {
      // Start a new batch if not already in one
      if (batchStartVersion === null) {
        const doc = documentService.read(filePath);
        if (doc) batchStartVersion = doc.version;
      }

      // Apply tool call — all calls in a batch share the same target version
      const updated = documentService.applyTool(filePath, name, validatedParams.data as Record<string, unknown>, (batchStartVersion ?? 0) + 1);

      // Reset debounce timer — version is created only after the batch settles
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { flushVersionBatch(); }, debounceMs);

      return buildMcpResponse(`Applied ${name} → version ${updated.version}`);
    } catch (err) {
      return buildMcpResponse(`Error applying ${name}: ${formatError(err)}`, true);
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
