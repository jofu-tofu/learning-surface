import type { ToolDefinitionEntry } from '../shared/schemas.js';
import type { ToolSelectionContext } from './tool-selector.js';

/** Build a JSON Schema for the planning response — tools enum auto-derived from available tools. */
export function buildPlanningSchema(availableTools: ToolDefinitionEntry[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      tools: {
        type: 'array',
        items: {
          type: 'string',
          enum: availableTools.map(t => t.name),
        },
      },
    },
    required: ['tools'],
    additionalProperties: false,
  };
}

/** Build a lightweight system prompt for the planning stage. */
export function buildPlanningPrompt(ctx: ToolSelectionContext, availableTools: ToolDefinitionEntry[]): string {
  const toolList = availableTools
    .map(t => `- ${t.name}: ${t.label}`)
    .join('\n');

  const stateLines: string[] = [];
  if (ctx.canvasType) stateLines.push(`Canvas: ${ctx.canvasType}`);
  else stateLines.push('Canvas: empty');
  stateLines.push(`Explanation: ${ctx.hasExplanation ? 'present' : 'empty'}`);
  stateLines.push(`Sections: ${ctx.sectionCount}`);

  if (ctx.document?.sections) {
    const titles = ctx.document.sections.map(s => s.title).join(', ');
    stateLines.push(`Section titles: ${titles}`);
  }

  return [
    'You are a tool planner. Given the user prompt and current surface state, select which tools will be needed.',
    'Return ONLY the tool names that should be used. Select the minimal set needed.',
    '',
    'Available tools:',
    toolList,
    '',
    'Current surface state:',
    ...stateLines.map(l => `- ${l}`),
  ].join('\n');
}

/** Parse the planning result into tool entries. Fail-open: returns all tools if result is invalid. */
export function parsePlanResult<T extends ToolDefinitionEntry>(
  result: Record<string, unknown>,
  availableTools: T[],
): T[] {
  const tools = result.tools;
  if (!Array.isArray(tools) || tools.length === 0) return availableTools;

  const nameSet = new Set(availableTools.map(t => t.name));
  const selected = tools.filter((name): name is string =>
    typeof name === 'string' && nameSet.has(name),
  );

  if (selected.length === 0) return availableTools;

  const selectedSet = new Set(selected);
  return availableTools.filter(t => selectedSet.has(t.name));
}
