/**
 * Human-readable labels for MCP tool calls.
 * Displayed in the frontend activity status during processing.
 *
 * To add a new tool: add its name here and in TOOL_DEFS (schemas.ts).
 * To rename a tool: update both places.
 */
export const TOOL_LABELS: Record<string, string> = {
  show_visual: 'Building diagram',
  build_visual: 'Extending diagram',
  explain: 'Writing explanation',
  extend: 'Extending explanation',
  challenge: 'Adding comprehension check',
  reveal: 'Revealing answer',
  suggest_followups: 'Suggesting follow-ups',
  new_section: 'Creating section',
  set_active: 'Switching section',
  clear: 'Clearing content',
};

/** Pseudo-tool names for non-tool-call processing phases. */
const PHASE_LABELS: Record<string, string> = {
  thinking: 'Thinking',
};

/** Get the display label for a tool or phase name. Falls back to the raw name. */
export function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? PHASE_LABELS[name] ?? name;
}
