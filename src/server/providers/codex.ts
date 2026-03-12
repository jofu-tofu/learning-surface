import OpenAI from 'openai';
import type {
  ReplProvider,
  ProviderConfig,
  ToolDefinition,
  ProviderToolCall,
  ToolCallResult,
} from '../../shared/providers.js';

const MAX_TOOL_ROUNDS = 20;

export function createCodexProvider(): ReplProvider {
  const config: ProviderConfig = {
    id: 'codex',
    name: 'Codex',
    models: [
      { id: 'spark', name: 'Spark' },
      { id: '5.4-low', name: '5.4 Low' },
    ],
  };

  const client = new OpenAI(); // reads OPENAI_API_KEY from env

  return {
    config,

    async complete({ prompt, systemPrompt, tools, model, onToolCall }) {
      const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
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
        const response = await client.chat.completions.create({
          model,
          messages,
          tools: openaiTools,
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
            tool: toolCall.function.name,
            params,
          };

          let result: ToolCallResult;
          try {
            result = await onToolCall(call);
          } catch (err) {
            result = {
              success: false,
              message: `Error: ${err instanceof Error ? err.message : String(err)}`,
            };
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
