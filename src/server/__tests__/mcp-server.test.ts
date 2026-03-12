import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../mcp-server.js';
import { toolSchemaMap } from '../../shared/schemas.js';
import { parse, serialize } from '../markdown.js';
import { MINIMAL_DOC, buildDocument, buildSection, buildCanvasContent } from '../../test/helpers.js';
import type { VersionStore } from '../../shared/types.js';

function stubVersionStore(): VersionStore {
  return {
    async init() {},
    async createVersion() { return 1; },
    async getVersion() { return ''; },
    async getCurrentVersion() { return 0; },
    async listVersions() { return []; },
    async getDiff() { return ''; },
  };
}

function spyVersionStore(): VersionStore & { createVersion: ReturnType<typeof vi.fn> } {
  return {
    async init() {},
    createVersion: vi.fn(async () => 1),
    async getVersion() { return ''; },
    async getCurrentVersion() { return 0; },
    async listVersions() { return []; },
    async getDiff() { return ''; },
  };
}

describe('MCP Server', () => {
  const TOOL_NAMES = [
    'show_visual',
    'build_visual',
    'explain',
    'extend',
    'challenge',
    'reveal',
    'suggest_followups',
    'new_section',
    'set_active',
  ] as const;

  describe('tool schema validation', () => {
    it('show_visual schema rejects invalid type', () => {
      const schema = toolSchemaMap.get('show_visual')!;
      const result = schema.safeParse({ type: 'invalid', content: 'x' });
      expect(result.success).toBe(false);
    });
  });

  describe('batch versioning', () => {
    let sessionDir: string;
    let store: VersionStore & { createVersion: ReturnType<typeof vi.fn> };
    let client: Client;
    let mcpServer: ReturnType<typeof createMcpServer>;

    beforeEach(async () => {
      sessionDir = await mkdtemp(join(tmpdir(), 'ls-mcp-test-'));
      await writeFile(join(sessionDir, 'current.md'), MINIMAL_DOC, 'utf-8');

      store = spyVersionStore();
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

      mcpServer = createMcpServer({
        sessionDir,
        versionStore: store,
        debounceMs: 50,
        transport: serverTransport,
      });

      client = new Client({ name: 'test-client', version: '1.0.0' });
      await Promise.all([mcpServer.start(), client.connect(clientTransport)]);
    });

    afterEach(async () => {
      // Cancel any pending debounce timers before deleting the temp directory
      await mcpServer.flushVersionBatch();
      await client.close();
      await rm(sessionDir, { recursive: true, force: true });
    });

    it('flushVersionBatch is a no-op when no batch is pending', async () => {
      await mcpServer.flushVersionBatch();
      expect(store.createVersion).not.toHaveBeenCalled();
    });

    it('stop() flushes any pending batch', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Stopping soon.' } });
      expect(store.createVersion).not.toHaveBeenCalled();

      await mcpServer.stop();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });
  });
});
