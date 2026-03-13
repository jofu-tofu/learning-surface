import type { vi} from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../mcp-server.js';
import { toolSchemaMap } from '../../shared/schemas.js';
import { MINIMAL_DOC, spyVersionStore } from '../../test/helpers.js';
import type { VersionStore } from '../../test/helpers.js';

describe('MCP Server', () => {
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

  describe('tool call validation boundaries', () => {
    let sessionDir: string;
    let store: VersionStore & { createVersion: ReturnType<typeof vi.fn> };
    let client: Client;
    let mcpServer: ReturnType<typeof createMcpServer>;

    beforeEach(async () => {
      sessionDir = await mkdtemp(join(tmpdir(), 'ls-mcp-val-'));
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

    it('invalid params rejected by Zod schema (show_visual with bad enum)', async () => {
      const result = await client.callTool({
        name: 'show_visual',
        arguments: { type: 'svg', content: 'test' },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Invalid params');
    });

    it('missing required params rejected by Zod schema', async () => {
      const result = await client.callTool({
        name: 'explain',
        arguments: {},
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Invalid params');
    });

    it('challenge with wrong hints type rejected by Zod', async () => {
      const result = await client.callTool({
        name: 'challenge',
        arguments: { question: 'Q?', hints: 'not-an-array' },
      });
      expect(result.isError).toBe(true);
    });

    it('valid tool call with optional params succeeds', async () => {
      const result = await client.callTool({
        name: 'show_visual',
        arguments: { type: 'code', content: 'console.log("hi")', language: 'javascript' },
      });
      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Applied show_visual');
    });
  });
});
