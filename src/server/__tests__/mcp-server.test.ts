import { describe, it, expect } from 'vitest';
import { createMcpServer, toolSchemaMap } from '../mcp-server.js';

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
      it(`${toolName} has a valid Zod schema registered`, () => {
        const schema = toolSchemaMap.get(toolName);
        expect(schema).toBeDefined();
      });
    }
  });

  describe('tool schema validation', () => {
    const validParams: Record<string, Record<string, unknown>> = {
      show_visual: { type: 'mermaid', content: 'graph LR\n  A-->B' },
      edit_visual: { find: 'A', replace: 'B' },
      build_visual: { additions: 'C --> D' },
      annotate: { element: 'A', label: 'Node A' },
      explain: { content: 'This explains it.' },
      edit_explanation: { find: 'old', replace: 'new' },
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
});
