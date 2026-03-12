import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../shared/schemas.js';
import { parse, serialize, applyToolCall } from './markdown.js';
import { createVersionStore } from './versions.js';

// Re-export for tests
export { toolSchemaMap } from '../shared/schemas.js';

// --- Factory ---

export function createMcpServer(options: {
  sessionDir: string;
}): { start(): Promise<void>; stop(): Promise<void> } {
  const { sessionDir } = options;

  const versionStore = createVersionStore();
  let versionStoreReady = false;

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

    // Initialize version store lazily
    if (!versionStoreReady) {
      await versionStore.init(sessionDir);
      versionStoreReady = true;
    }

    try {
      // Read current document
      const filePath = join(sessionDir, 'current.md');
      const raw = readFileSync(filePath, 'utf-8');
      const doc = parse(raw);

      // Apply tool call
      const updated = applyToolCall(doc, name, parsed.data as Record<string, unknown>);
      updated.version = doc.version + 1;

      // Write back
      const content = serialize(updated);
      writeFileSync(filePath, content, 'utf-8');

      // Create version
      await versionStore.createVersion(content, {
        prompt: null,
        timestamp: new Date().toISOString(),
        source: 'ai',
      });

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
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
    async stop() {
      await server.close();
    },
  };
}
