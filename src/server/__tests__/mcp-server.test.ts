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
    'complete_section',
    'set_active',
  ] as const;

  it('creates an MCP server instance', () => {
    const server = createMcpServer({ sessionDir: '/tmp/test', versionStore: stubVersionStore() });
    expect(server).toBeDefined();
    expect(server.start).toBeDefined();
    expect(server.stop).toBeDefined();
  });

  it('exposes flushVersionBatch', () => {
    const server = createMcpServer({ sessionDir: '/tmp/test', versionStore: stubVersionStore() });
    expect(server.flushVersionBatch).toBeDefined();
    expect(typeof server.flushVersionBatch).toBe('function');
  });

  describe('tool schemas', () => {
    for (const toolName of TOOL_NAMES) {
      it(`${toolName} has a valid Zod schema registered`, () => {
        const schema = toolSchemaMap.get(toolName);
        expect(schema).toBeDefined();
      });
    }
  });

  describe('tool schema validation', () => {
    const validParams: Record<string, Record<string, unknown>> = {
      show_visual: { type: 'mermaid', content: 'graph LR\n  A-->B' },
      build_visual: { additions: 'C --> D' },
      explain: { content: 'This explains it.' },
      extend: { content: 'More text.' },
      challenge: { question: 'Why?' },
      reveal: { checkId: 'c1', answer: 'Because.', explanation: 'Detailed.' },
      suggest_followups: { questions: ['What next?'] },
      new_section: { title: 'New Topic' },
      complete_section: { section: 'intro' },
      set_active: { section: 'intro' },
    };

    for (const toolName of TOOL_NAMES) {
      it(`${toolName} schema accepts valid params`, () => {
        const schema = toolSchemaMap.get(toolName)!;
        const result = schema.safeParse(validParams[toolName]);
        expect(result.success).toBe(true);
      });
    }

    it('show_visual schema rejects invalid type', () => {
      const schema = toolSchemaMap.get('show_visual')!;
      const result = schema.safeParse({ type: 'invalid', content: 'x' });
      expect(result.success).toBe(false);
    });

    it('challenge schema accepts optional hints', () => {
      const schema = toolSchemaMap.get('challenge')!;
      const result = schema.safeParse({ question: 'Why?', hints: ['Think about it'] });
      expect(result.success).toBe(true);
    });

    it('extend schema accepts optional position', () => {
      const schema = toolSchemaMap.get('extend')!;
      const result = schema.safeParse({ content: 'More.', position: 'before' });
      expect(result.success).toBe(true);
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

    it('single tool call creates one version after flush', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Hello world.' } });

      // Version not created yet (debounce hasn't fired)
      expect(store.createVersion).not.toHaveBeenCalled();

      // Flush to create the version
      await mcpServer.flushVersionBatch();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });

    it('multiple tool calls in a batch create only one version', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Step 1.' } });
      await client.callTool({ name: 'challenge', arguments: { question: 'Why?' } });
      await client.callTool({ name: 'suggest_followups', arguments: { questions: ['What next?'] } });

      expect(store.createVersion).not.toHaveBeenCalled();

      await mcpServer.flushVersionBatch();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });

    it('all tool calls in a batch share the same version number', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Step 1.' } });
      const midDoc = parse(readFileSync(join(sessionDir, 'current.md'), 'utf-8'));

      await client.callTool({ name: 'challenge', arguments: { question: 'Why?' } });
      const finalDoc = parse(readFileSync(join(sessionDir, 'current.md'), 'utf-8'));

      // Both should have version 2 (original was 1)
      expect(midDoc.version).toBe(2);
      expect(finalDoc.version).toBe(2);
    });

    it('debounce timer auto-flushes after quiet period', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Auto flush test.' } });

      // Wait for the debounce (50ms) + some buffer
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });

    it('stop() flushes any pending batch', async () => {
      await client.callTool({ name: 'explain', arguments: { content: 'Stopping soon.' } });
      expect(store.createVersion).not.toHaveBeenCalled();

      await mcpServer.stop();
      expect(store.createVersion).toHaveBeenCalledTimes(1);
    });

    it('separate batches create separate versions', async () => {
      // First batch
      await client.callTool({ name: 'explain', arguments: { content: 'Batch 1.' } });
      await mcpServer.flushVersionBatch();
      expect(store.createVersion).toHaveBeenCalledTimes(1);

      // Second batch
      await client.callTool({ name: 'challenge', arguments: { question: 'Why?' } });
      await mcpServer.flushVersionBatch();
      expect(store.createVersion).toHaveBeenCalledTimes(2);
    });

    it('version in document increments correctly across batches', async () => {
      // Batch 1: version 1 → 2
      await client.callTool({ name: 'explain', arguments: { content: 'First.' } });
      await mcpServer.flushVersionBatch();

      // Batch 2: version 2 → 3
      await client.callTool({ name: 'challenge', arguments: { question: 'Why?' } });
      const doc = parse(readFileSync(join(sessionDir, 'current.md'), 'utf-8'));
      expect(doc.version).toBe(3);
    });
  });
});
