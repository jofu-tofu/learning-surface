import { describe, it, expect } from 'vitest';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../../shared/schemas.js';

/**
 * Cross-module consistency checks.
 * Validates contracts between TOOL_DEFS, handlers, and schemas.
 */
describe('tool contracts', () => {
  it('every TOOL_DEFS entry has a matching schema in toolSchemaMap', () => {
    for (const def of TOOL_DEFS) {
      expect(toolSchemaMap.has(def.name)).toBe(true);
    }
  });

  it('every tool schema converts to valid JSON Schema', () => {
    for (const def of TOOL_DEFS) {
      const jsonSchema = zodToJsonSchema(def.schema);
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(typeof jsonSchema.properties).toBe('object');
    }
  });

  it('toolSchemaMap has exact same entries as TOOL_DEFS', () => {
    expect(toolSchemaMap.size).toBe(TOOL_DEFS.length);
    for (const def of TOOL_DEFS) {
      expect(toolSchemaMap.get(def.name)).toBe(def.schema);
    }
  });

  it('TOOL_DEFS has exactly one tool: design_surface', () => {
    expect(TOOL_DEFS).toHaveLength(1);
    expect(TOOL_DEFS[0].name).toBe('design_surface');
  });
});
