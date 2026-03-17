// === Agent Abstraction ===

import { z } from 'zod';

// === Zod Schemas for Provider Data Contracts ===

const ReasoningEffortSchema = z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

const ModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  reasoningEfforts: z.array(ReasoningEffortSchema).optional(),
  defaultEffort: ReasoningEffortSchema.optional(),
});
export const ProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(ModelConfigSchema),
  type: z.enum(['cli', 'api']),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()), // JSON Schema
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ProviderToolCallSchema = z.object({
  toolName: z.string(),
  params: z.record(z.unknown()),
});
export type ProviderToolCall = z.infer<typeof ProviderToolCallSchema>;

/** Result returned to the AI after a tool call is executed. */
const ToolCallResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;

/** Result of a provider preflight check. */
export const PreflightResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type PreflightResult = z.infer<typeof PreflightResultSchema>;

/**
 * Unified AI agent interface.
 * Callers never know or care whether the underlying provider is CLI or API.
 */
export interface Agent {
  readonly config: ProviderConfig;

  /** Check if the provider is reachable and ready to accept prompts. */
  preflight(model: string): Promise<PreflightResult>;

  /** Multi-round: send prompt with tools, process tool calls in a loop via onToolCall. */
  run(opts: {
    prompt: string;
    systemPrompt: string;
    tools?: ToolDefinition[];
    model: string;
    sessionDir: string;
    reasoningEffort?: ReasoningEffort;
    onToolCall?: (call: ProviderToolCall) => Promise<ToolCallResult>;
  }): Promise<void>;
}

/** Serializable provider/model info for the frontend. */
const ProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(ModelConfigSchema),
  type: z.enum(['cli', 'api']).optional(),
  status: z.object({
    available: z.boolean(),
    error: z.string().optional(),
  }).optional(),
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;
