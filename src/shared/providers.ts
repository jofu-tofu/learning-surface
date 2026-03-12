// === REPL Provider Abstraction ===

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelConfig {
  id: string;
  name: string;
  displayName?: string;
  reasoningEfforts?: ReasoningEffort[];
  defaultEffort?: ReasoningEffort;
}

export interface ProviderConfig {
  id: string;
  name: string;
  models: ModelConfig[];
  type: 'cli' | 'api';
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ProviderToolCall {
  tool: string;
  params: Record<string, unknown>;
}

/** Result returned to the AI after a tool call is executed. */
export interface ToolCallResult {
  success: boolean;
  message: string;
}

/**
 * A REPL provider sends user prompts to an AI model and receives tool calls back.
 * The tool calls are executed against the learning surface document.
 */
export interface ReplProvider {
  readonly config: ProviderConfig;

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
export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelConfig[];
}
