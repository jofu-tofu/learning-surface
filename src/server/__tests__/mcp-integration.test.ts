import { describe, it, expect, afterAll } from 'vitest';
import { writeMcpConfig, cleanupMcpConfig, codexMcpConfigArgs, buildCliPrompt } from '../providers/spawn-cli.js';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../mcp-server.js';

const SESSION_DIR = join(tmpdir(), `ls-mcp-test-${Date.now()}`);

afterAll(async () => {
  await rm(SESSION_DIR, { recursive: true, force: true });
});

describe('MCP integration dry run', () => {
  it('codexMcpConfigArgs produces valid -c flags with session dir', () => {
    const args = codexMcpConfigArgs(SESSION_DIR);
    expect(args).toHaveLength(4);
    expect(args[0]).toBe('-c');
    expect(args[1]).toContain('mcp_servers.learning-surface.command');
    expect(args[2]).toBe('-c');
    expect(args[3]).toContain('mcp_servers.learning-surface.args');
    expect(args[3]).toContain(SESSION_DIR);
  });

  it('writeMcpConfig creates valid JSON config with session dir', async () => {
    const configPath = await writeMcpConfig(SESSION_DIR);
    try {
      const raw = await readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);
      expect(config.mcpServers['learning-surface'].command).toBeTruthy();
      expect(config.mcpServers['learning-surface'].args).toContain(SESSION_DIR);
    } finally {
      await cleanupMcpConfig(configPath);
    }
  });

  it('buildCliPrompt passes system prompt through without CLI_SYSTEM_PROMPT', () => {
    const result = buildCliPrompt('System prompt content', 'User request');
    expect(result).toContain('System prompt content');
    expect(result).toContain('User request');
    expect(result).not.toContain('current.surface');
    expect(result).not.toContain('Edit the file');
  });

  it('MCP server starts without versionStore and responds to tool calls', async () => {
    await mkdir(SESSION_DIR, { recursive: true });
    await writeFile(
      join(SESSION_DIR, 'current.surface'),
      JSON.stringify({ version: 1, activeSection: 'start', sections: [{ id: 'start', title: 'Start', canvases: [], deeperPatterns: [] }] }),
    );

    // Same config as mcp-entry.ts: no versionStore
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer({
      sessionDir: SESSION_DIR,
      transport: serverTransport,
    });
    await server.start();

    const client = new Client({ name: 'test', version: '1.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // List tools — should include design_surface
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toContain('design_surface');

    // Call design_surface — should apply changes
    const result = await client.callTool({
      name: 'design_surface',
      arguments: {
        sections: [{ title: 'Test Section', explanation: 'Hello from MCP' }],
      },
    });
    expect(result.isError).toBeFalsy();

    // Verify the surface file was updated
    const raw = await readFile(join(SESSION_DIR, 'current.surface'), 'utf-8');
    expect(raw).toContain('Test Section');
    expect(raw).toContain('Hello from MCP');

    await server.stop();
  });
});
