import { describe, it, expect, vi } from 'vitest';
import { createMcpServer } from '../mcp-server.js';

describe('MCP Server', () => {
  const TOOL_NAMES = [
    'show_visual',
    'edit_visual',
    'build_visual',
    'annotate',
    'explain',
    'edit_explanation',
    'extend',
    'challenge',
    'reveal',
    'suggest_followups',
    'new_section',
    'complete_section',
    'set_active',
  ] as const;

  it('creates an MCP server instance', () => {
    const server = createMcpServer({ sessionDir: '/tmp/test' });
    expect(server).toBeDefined();
    expect(server.start).toBeDefined();
    expect(server.stop).toBeDefined();
  });

  describe('tool schemas', () => {
    for (const toolName of TOOL_NAMES) {
      it(`${toolName} has a valid Zod schema that validates correct params`, () => {
        // Each tool must define a Zod schema for parameter validation
        // The server should expose tool definitions that can be validated
        const server = createMcpServer({ sessionDir: '/tmp/test' });
        expect(server).toBeDefined();
        // This will fail until tool schemas are implemented
        expect(typeof toolName).toBe('string');
        // The actual test: server should have registered this tool with a schema
        throw new Error(`Tool schema for '${toolName}' not yet testable`);
      });
    }
  });

  describe('tool handlers', () => {
    it('show_visual handler calls applyToolCall with correct arguments', () => {
      const server = createMcpServer({ sessionDir: '/tmp/test' });
      // Mock the markdown engine and version store
      // Call the show_visual handler
      // Assert applyToolCall was called with ('show_visual', { type, content })
      expect(server).toBeDefined();
      throw new Error('Tool handler test not yet implemented');
    });

    it('tool handler reads current.md, applies transform, and writes back', () => {
      const server = createMcpServer({ sessionDir: '/tmp/test' });
      expect(server).toBeDefined();
      throw new Error('Read-transform-write cycle not yet testable');
    });

    it('tool handler calls VersionStore.createVersion after write', () => {
      const server = createMcpServer({ sessionDir: '/tmp/test' });
      expect(server).toBeDefined();
      throw new Error('Version creation after tool call not yet testable');
    });
  });
});
