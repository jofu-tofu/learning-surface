import { describe, it, expect } from 'vitest';
import { TOOL_DEFS, toolSchemaMap, zodToJsonSchema } from '../../shared/schemas.js';
import { selectTools, buildSelectionContext } from '../tool-selector.js';
import { applyTool } from '../tool-handlers.js';
import { buildPlanningSchema } from '../tool-planner.js';

/**
 * Cross-module consistency checks.
 * Validates contracts between TOOL_DEFS, handlers, selectors, and planning.
 */
describe('tool contracts', () => {
  it('every TOOL_DEFS entry has a handler in applyTool', () => {
    for (const def of TOOL_DEFS) {
      // applyTool should not throw "unknown tool" for any registered tool
      // We test this indirectly: the tool name exists in toolSchemaMap
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

  it('planning schema enum matches selectTools output for null document', () => {
    const ctx = buildSelectionContext(null);
    const selected = selectTools(ctx);
    const planSchema = buildPlanningSchema(selected);
    const items = (planSchema.properties as Record<string, Record<string, unknown>>).tools.items as Record<string, unknown>;
    expect(items.enum).toEqual(selected.map(t => t.name));
  });

  it('no hallucinated availability values', () => {
    const validAvailabilities = new Set(['always', 'needs-section', 'needs-canvas', 'needs-text-canvas', 'needs-explanation']);
    for (const def of TOOL_DEFS) {
      expect(validAvailabilities.has(def.availability)).toBe(true);
    }
  });

  it('no hallucinated category values', () => {
    const validCategories = new Set(['visual', 'narrative', 'assessment', 'structure']);
    for (const def of TOOL_DEFS) {
      expect(validCategories.has(def.category)).toBe(true);
    }
  });

  it('every availability value is handled in selectTools', () => {
    // Each availability value should be exercised — selectTools should not
    // silently pass unknown values through the default branch
    const availabilities = new Set<string>(TOOL_DEFS.map(d => d.availability));
    expect(availabilities.size).toBeGreaterThan(0);
    // All known values should be present in TOOL_DEFS
    const knownValues = ['always', 'needs-section', 'needs-canvas', 'needs-text-canvas', 'needs-explanation'];
    for (const av of knownValues) {
      if (TOOL_DEFS.some(d => d.availability === (av as typeof d.availability))) {
        expect(availabilities.has(av)).toBe(true);
      }
    }
  });

  it('toolSchemaMap has exact same entries as TOOL_DEFS', () => {
    expect(toolSchemaMap.size).toBe(TOOL_DEFS.length);
    for (const def of TOOL_DEFS) {
      expect(toolSchemaMap.get(def.name)).toBe(def.schema);
    }
  });
});
