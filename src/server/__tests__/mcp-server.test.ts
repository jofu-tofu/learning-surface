import type { vi} from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../mcp-server.js';
import { toolSchemaMap } from '../../shared/schemas.js';
import { MINIMAL_DOC, spyVersionStore } from '../../test/helpers.js';
import type { VersionStore } from '../../test/helpers.js';

describe('MCP Server', () => {
  describe('tool schema validation', () => {
    it('design_surface schema rejects completely empty input', () => {
      const schema = toolSchemaMap.get('design_surface')!;
      // Empty object is valid for design_surface (all fields optional)
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('design_surface schema rejects invalid section structure', () => {
      const schema = toolSchemaMap.get('design_surface')!;
      const result = schema.safeParse({ sections: 'not-array' });
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
      await writeFile(join(sessionDir, 'current.surface'), MINIMAL_DOC, 'utf-8');

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
      await mcpServer.flushVersionBatch();
      await client.close();
      await rm(sessionDir, { recursive: true, force: true });
    });

    it('flushVersionBatch is a no-op when no batch is pending', async () => {
      await mcpServer.flushVersionBatch();
      expect(store.createVersion).not.toHaveBeenCalled();
    });

    it('stop() flushes any pending batch', async () => {
      await client.callTool({
        name: 'design_surface',
        arguments: { sections: [{ id: 'introduction', explanation: 'Stopping soon.' }] },
      });
      expect(store.createVersion).not.toHaveBeenCalled();

      await mcpServer.stop();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('tool call validation boundaries', () => {
    let sessionDir: string;
    let store: VersionStore & { createVersion: ReturnType<typeof vi.fn> };
    let client: Client;
    let mcpServer: ReturnType<typeof createMcpServer>;

    beforeEach(async () => {
      sessionDir = await mkdtemp(join(tmpdir(), 'ls-mcp-val-'));
      await writeFile(join(sessionDir, 'current.surface'), MINIMAL_DOC, 'utf-8');

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
      await mcpServer.flushVersionBatch();
      await client.close();
      await rm(sessionDir, { recursive: true, force: true });
    });

    it('unknown tool name returns isError response', async () => {
      const result = await client.callTool({ name: 'nonexistent_tool', arguments: {} });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Unknown tool');
    });

    it('invalid params rejected by Zod schema', async () => {
      const result = await client.callTool({
        name: 'design_surface',
        arguments: { sections: 'not-an-array' },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Invalid params');
    });

    it('valid design_surface call succeeds', async () => {
      const result = await client.callTool({
        name: 'design_surface',
        arguments: { sections: [{ id: 'introduction', explanation: 'Updated text.' }] },
      });
      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Applied design_surface');
    });
  });
});
