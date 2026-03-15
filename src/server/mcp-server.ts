import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { TOOL_DEFS, DesignSurfaceSchema, zodToJsonSchema } from '../shared/schemas.js';
import type { LearningDocument, VersionStore } from '../shared/types.js';
import { detectChangedPanes, detectChangedSections } from '../shared/detectChangedPanes.js';
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

  const store = versionStore ?? null;

  const documentService = options.documentService ?? createDocumentService();
  const filePath = documentService.filePath(sessionDir);

  // --- Batch versioning state ---
  let batchStartVersion: number | null = null;
  let batchStartDoc: LearningDocument | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function flushVersionBatch(): Promise<void> {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    if (!store) return;
    if (batchStartVersion === null) return;

    const content = documentService.readRaw(filePath);
    const doc = documentService.read(filePath);
    if (!content || !doc) return;

    // Compute which panes/sections changed for persistent metadata
    const paneChanges = batchStartDoc ? detectChangedPanes(batchStartDoc, doc) : new Set<string>();
    const sectionChanges = batchStartDoc ? detectChangedSections(batchStartDoc, doc) : new Set<string>();

    await store.createVersion(
      content,
      buildVersionMeta(
        null,
        doc.summary ?? null,
        new Date().toISOString(),
        [...paneChanges],
        [...sectionChanges],
      ),
    );
    batchStartVersion = null;
    batchStartDoc = null;

    // Re-write current.surface to trigger the file watcher so the UI picks up the new version
    documentService.write(filePath, doc);
  }

  const server = new Server(
    { name: 'learning-surface', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Register list-tools handler — single tool, always available
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFS.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: zodToJsonSchema(def.schema),
      })),
    };
  });

  // Register call-tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArguments } = request.params;

    if (name !== 'design_surface') {
      return buildMcpResponse(`Unknown tool: ${name}`, true);
    }

    // Validate params
    const validatedParams = DesignSurfaceSchema.safeParse(toolArguments);
    if (!validatedParams.success) return buildMcpResponse(`Invalid params: ${validatedParams.error.message}`, true);

    try {
      // Start a new batch if not already in one
      if (store && batchStartVersion === null) {
        const doc = documentService.read(filePath);
        if (doc) {
          batchStartVersion = doc.version;
          batchStartDoc = structuredClone(doc);
        }
      }

      // Apply design_surface — all calls in a batch share the same target version
      const result = documentService.applyDesignSurface(
        filePath,
        validatedParams.data,
        (batchStartVersion ?? 0) + 1,
      );

      // Reset debounce timer — version is created only after the batch settles
      if (store) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { flushVersionBatch(); }, debounceMs);
      }

      // Return structured result
      if (result.results.errors.length > 0) {
        return buildMcpResponse(JSON.stringify(result.results));
      }
      return buildMcpResponse(`Applied design_surface → version ${result.doc.version}`);
    } catch (err) {
      return buildMcpResponse(`Error applying design_surface: ${formatError(err)}`, true);
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
