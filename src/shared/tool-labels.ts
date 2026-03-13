/**
 * Human-readable labels for MCP tool calls and processing phases.
 * Displayed in the frontend activity status during processing.
 *
 * Tool labels are derived from TOOL_DEFS (schemas.ts) — single source of truth.
 */
import { TOOL_DEFS } from './schemas.js';

/** Tool name → human-readable label, derived from TOOL_DEFS. */
export const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  TOOL_DEFS.map(def => [def.name, def.label]),
);

/** Pseudo-tool names for non-tool-call processing phases. */
const PHASE_LABELS: Record<string, string> = {
  thinking: 'Thinking',
};

/** Get the display label for a tool or phase name. Falls back to the raw name. */
export function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? PHASE_LABELS[name] ?? name;
}
