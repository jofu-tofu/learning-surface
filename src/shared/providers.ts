// === REPL Provider Abstraction ===

import { z } from 'zod';

// === Zod Schemas for Provider Data Contracts ===

export const ReasoningEffortSchema = z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const ModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  reasoningEfforts: z.array(ReasoningEffortSchema).optional(),
  defaultEffort: ReasoningEffortSchema.optional(),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const ProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(ModelConfigSchema),
  type: z.enum(['cli', 'api']),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const ToolDefinitionSchema = z.object({
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
export const ToolCallResultSchema = z.object({
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
 * A REPL provider sends user prompts to an AI model and receives tool calls back.
 * The tool calls are executed against the learning surface document.
 */
export interface ReplProvider {
  readonly config: ProviderConfig;

  /** Check if the provider is reachable and ready to accept prompts. */
  preflight(model: string): Promise<PreflightResult>;

  /**
   * Send a prompt to the AI model and process tool calls in a loop.
   * The provider should call onToolCall for each tool the AI wants to invoke,
   * then feed the result back to the AI until it's done.
   */
  complete(opts: {
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
export const ProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(ModelConfigSchema),
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;
