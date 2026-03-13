import OpenAI from 'openai';
import type {
  ReplProvider,
  ProviderConfig,
  ProviderToolCall,
  ToolCallResult,
  ReasoningEffort,
  PreflightResult,
} from '../../shared/providers.js';
import { formatError } from '../utils/ws-helpers.js';

const MAX_TOOL_ROUNDS = 20;

type OpenAIReasoningEffort = NonNullable<OpenAI.ChatCompletionCreateParams['reasoning_effort']>;

/** Map our unified effort levels to the OpenAI API reasoning_effort values. */
function toOpenAIEffort(effort: ReasoningEffort): OpenAIReasoningEffort | undefined {
  const map: Record<ReasoningEffort, OpenAIReasoningEffort | undefined> = {
    none: 'none',
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'xhigh',
  };
  return map[effort];
}

export function createCodexProvider(): ReplProvider {
  const config: ProviderConfig = {
    id: 'codex-api',
    name: 'Codex (API)',
    type: 'api',
    models: [
      {
        id: 'spark', name: 'Spark', displayName: '5.3 Spark',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'medium',
      },
      {
        id: '5.4-low', name: '5.4 Low', displayName: '5.4 Low',
        reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
        defaultEffort: 'high',
      },
    ],
  };

  const client = new OpenAI(); // reads OPENAI_API_KEY from env

  return {
    config,

    async preflight(): Promise<PreflightResult> {
      try {
        await client.models.list();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: formatError(err) };
      }
    },

    async complete({ prompt, systemPrompt, tools, model, reasoningEffort, onToolCall }) {
      const openaiTools: OpenAI.ChatCompletionTool[] = (tools ?? []).map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const apiEffort = reasoningEffort ? toOpenAIEffort(reasoningEffort) : undefined;
        const response = await client.chat.completions.create({
          model,
          messages,
          tools: openaiTools,
          ...(apiEffort ? { reasoning_effort: apiEffort } : {}),
        });

        const choice = response.choices[0];
        if (!choice) break;

        const assistantMsg = choice.message;
        messages.push(assistantMsg);

        // If no tool calls, the model is done
        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
          break;
        }

        // Process each tool call
        for (const toolCall of assistantMsg.tool_calls) {
          if (toolCall.type !== 'function') continue;

          let params: Record<string, unknown>;
          try {
            params = JSON.parse(toolCall.function.arguments);
          } catch {
            params = {};
          }

          const call: ProviderToolCall = {
            toolName: toolCall.function.name,
            params,
          };

          let result: ToolCallResult;
          try {
            result = onToolCall
              ? await onToolCall(call)
              : { success: false, message: 'No tool handler configured' };
          } catch (err) {
            result = { success: false, message: `Error: ${formatError(err)}` };
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.message,
          });
        }

        // If the model indicated it's done, stop
        if (choice.finish_reason === 'stop') break;
      }
    },
  };
}
