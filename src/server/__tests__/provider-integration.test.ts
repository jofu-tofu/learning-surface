import { describe, it, expect } from 'vitest';
import {
  ProviderConfigSchema,
  PreflightResultSchema,
  ProviderToolCallSchema,
} from '../../shared/providers.js';
import type { ProviderToolCall } from '../../shared/providers.js';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../../shared/schemas.js';

/**
 * Integration tests for provider implementations.
 *
 * Validates provider configs, preflight results, and API responses
 * against the Zod schemas defined in shared/providers.ts and shared/schemas.ts.
 *
 * Run with: INTEGRATION_TEST=1 npm test
 * API tests additionally require OPENAI_API_KEY in env.
 */

const SKIP_INTEGRATION = !process.env.INTEGRATION_TEST;
const HAS_OPENAI_KEY = !!process.env.OPENAI_API_KEY;

// Pre-compute tool definitions for API round-trip tests (same as prompt-handler.ts)
const providerTools = TOOL_DEFS.map((def) => ({
  name: def.name,
  description: def.description,
  parameters: zodToJsonSchema(def.schema),
}));

const KNOWN_TOOL_NAMES: Set<string> = new Set(TOOL_DEFS.map((d) => d.name));

describe.skipIf(SKIP_INTEGRATION)('Provider integration', () => {

  // --- Config schema validation (no API key needed) ---

  describe('Config schema validation', () => {
    it('codex CLI config matches ProviderConfigSchema', async () => {
      const { createCliProvider } = await import('../providers/cli.js');
      const provider = createCliProvider();
      const result = ProviderConfigSchema.safeParse(provider.config);
      if (!result.success) {
        throw new Error(`Config validation failed: ${JSON.stringify(result.error.issues)}`);
      }
      expect(result.success).toBe(true);
    });

    it('claude-code config matches ProviderConfigSchema', async () => {
      const { createClaudeCodeProvider } = await import('../providers/claude-code.js');
      const provider = createClaudeCodeProvider();
      const result = ProviderConfigSchema.safeParse(provider.config);
      if (!result.success) {
        throw new Error(`Config validation failed: ${JSON.stringify(result.error.issues)}`);
      }
      expect(result.success).toBe(true);
    });

    it.skipIf(!HAS_OPENAI_KEY)('codex API config matches ProviderConfigSchema', async () => {
      const { createCodexProvider } = await import('../providers/codex.js');
      const provider = createCodexProvider();
      const result = ProviderConfigSchema.safeParse(provider.config);
      if (!result.success) {
        throw new Error(`Config validation failed: ${JSON.stringify(result.error.issues)}`);
      }
      expect(result.success).toBe(true);
    });

    it('every model config has at least one reasoning effort when efforts are defined', async () => {
      const { createCliProvider } = await import('../providers/cli.js');
      const { createClaudeCodeProvider } = await import('../providers/claude-code.js');
      const providers = [createCliProvider(), createClaudeCodeProvider()];

      for (const provider of providers) {
        for (const model of provider.config.models) {
          if (model.reasoningEfforts) {
            expect(model.reasoningEfforts.length).toBeGreaterThan(0);
          }
          if (model.defaultEffort && model.reasoningEfforts) {
            expect(model.reasoningEfforts).toContain(model.defaultEffort);
          }
        }
      }
    });
  });

  // --- Preflight contract validation ---

  describe('Preflight schema validation', () => {
    it('codex CLI preflight returns valid PreflightResult', async () => {
      const { createCliProvider } = await import('../providers/cli.js');
      const provider = createCliProvider();
      const result = await provider.preflight('gpt-5.3-codex-spark');
      const parsed = PreflightResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      // ok=false is valid (binary might not be installed) — we only check the shape
      expect(typeof result.ok).toBe('boolean');
      if (!result.ok) {
        expect(typeof result.error).toBe('string');
      }
    });

    it('claude-code preflight returns valid PreflightResult', async () => {
      const { createClaudeCodeProvider } = await import('../providers/claude-code.js');
      const provider = createClaudeCodeProvider();
      const result = await provider.preflight('sonnet');
      const parsed = PreflightResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      expect(typeof result.ok).toBe('boolean');
      if (!result.ok) {
        expect(typeof result.error).toBe('string');
      }
    });

    it.skipIf(!HAS_OPENAI_KEY)('codex API preflight returns valid PreflightResult', async () => {
      const { createCodexProvider } = await import('../providers/codex.js');
      const provider = createCodexProvider();
      const result = await provider.preflight('spark');
      const parsed = PreflightResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      // With a valid key, preflight should succeed
      expect(result.ok).toBe(true);
    }, 15_000);
  });

  // --- API round-trip: tool calls match Zod schemas ---

  describe.skipIf(!HAS_OPENAI_KEY)('OpenAI API tool-call contract', () => {
    it('tool calls return params that pass Zod schema validation', async () => {
      const { createCodexProvider } = await import('../providers/codex.js');
      const provider = createCodexProvider();
      const toolCalls: ProviderToolCall[] = [];

      await provider.complete({
        prompt: 'Explain what a variable is in programming. Keep it to one sentence.',
        systemPrompt:
          'You are a teaching assistant. Use the provided tools to teach. ' +
          'You must call at least the explain tool. Keep responses very brief.',
        tools: providerTools,
        model: 'spark',
        sessionDir: '/tmp/test-integration',
        onToolCall: async (call) => {
          toolCalls.push(call);
          return { success: true, message: 'Applied successfully.' };
        },
      });

      // The AI should have made at least one tool call
      expect(toolCalls.length).toBeGreaterThan(0);

      for (const call of toolCalls) {
        // Every tool call object must match ProviderToolCallSchema shape
        const callResult = ProviderToolCallSchema.safeParse(call);
        if (!callResult.success) {
          throw new Error(
            `ProviderToolCall shape invalid for "${call.toolName}":\n` +
            JSON.stringify(callResult.error.issues),
          );
        }

        // Tool name must be one of our known tools
        expect(KNOWN_TOOL_NAMES.has(call.toolName)).toBe(true);

        // Params must pass the corresponding tool's Zod schema
        const schema = toolSchemaMap.get(call.toolName);
        expect(schema).toBeDefined();
        const paramResult = schema!.safeParse(call.params);
        if (!paramResult.success) {
          throw new Error(
            `Tool "${call.toolName}" params fail schema validation:\n` +
            `Params: ${JSON.stringify(call.params, null, 2)}\n` +
            `Errors: ${JSON.stringify(paramResult.error.issues, null, 2)}`,
          );
        }
      }
    }, 60_000);

    it('reasoning effort is accepted without error', async () => {
      const { createCodexProvider } = await import('../providers/codex.js');
      const provider = createCodexProvider();
      const toolCalls: ProviderToolCall[] = [];

      // Verify that passing a reasoning effort doesn't cause an API error
      await provider.complete({
        prompt: 'Say "hello" using the explain tool.',
        systemPrompt: 'You are a teaching assistant. Call the explain tool with a one-word response.',
        tools: providerTools,
        model: 'spark',
        sessionDir: '/tmp/test-integration',
        reasoningEffort: 'low',
        onToolCall: async (call) => {
          toolCalls.push(call);
          return { success: true, message: 'OK' };
        },
      });

      // Should complete without throwing
      expect(toolCalls.length).toBeGreaterThan(0);
    }, 60_000);
  });
});
