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
      // Empty object is now invalid — summary is required
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('design_surface schema rejects invalid blocks structure', () => {
      const schema = toolSchemaMap.get('design_surface')!;
      const result = schema.safeParse({ summary: 'test', blocks: 'not-array' });
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
        arguments: { summary: 'Stopping soon', blocks: [{ type: 'text', content: 'Stopping soon.' }] },
      });
      expect(store.createVersion).not.toHaveBeenCalled();

      await mcpServer.stop();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });

    it('persists changedPanes in version metadata', async () => {
      await client.callTool({
        name: 'design_surface',
        arguments: { summary: 'Changed blocks', blocks: [{ type: 'text', content: 'Changed content.' }] },
      });

      await mcpServer.flushVersionBatch();
      expect(store.createVersion).toHaveBeenCalledTimes(1);

      const meta = store.createVersion.mock.calls[0][1];
      expect(meta.changedPanes).toContain('blocks');
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
        arguments: { blocks: 'not-an-array' },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Invalid params');
    });

    it('valid design_surface call succeeds', async () => {
      const result = await client.callTool({
        name: 'design_surface',
        arguments: { summary: 'Updated text', blocks: [{ type: 'text', content: 'Updated text.' }] },
      });
      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Applied design_surface');
    });
  });
});
