/**
 * Standalone MCP server entry point for CLI providers.
 * Spawned as a subprocess by codex/claude via --mcp-config.
 * No version store — the prompt handler creates versions after the CLI finishes.
 *
 * Usage: node mcp-entry.js <sessionDir>
 */
import { createMcpServer } from './mcp-server.js';
import { createDocumentService } from './document-service.js';

const sessionDir = process.argv[2];
if (!sessionDir) {
  process.stderr.write('Usage: mcp-entry <sessionDir>\n');
  process.exit(1);
}

const server = createMcpServer({ sessionDir, documentService: createDocumentService() });
await server.start();

// Graceful shutdown when the CLI tool disconnects
process.stdin.on('end', async () => {
  await server.stop();
  process.exit(0);
});
