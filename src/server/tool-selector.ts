import { TOOL_DEFS } from '../shared/schemas.js';

/**
 * With a single tool (design_surface) that's always available,
 * tool selection is trivial — return all tool definitions.
 */
export function selectTools(): typeof TOOL_DEFS[number][] {
  return [...TOOL_DEFS];
}
