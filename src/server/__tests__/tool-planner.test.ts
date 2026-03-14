import { describe, it, expect } from 'vitest';
import { buildPlanningSchema, buildPlanningPrompt, parsePlanResult } from '../tool-planner.js';
import { TOOL_DEFS } from '../../shared/schemas.js';
import { buildSelectionContext } from '../tool-selector.js';
import { buildDocument, buildSection, buildCanvasContent } from '../../test/helpers.js';

describe('buildPlanningSchema', () => {
  it('enum matches available tool names', () => {
    const schema = buildPlanningSchema(TOOL_DEFS as unknown as typeof TOOL_DEFS[number][]);
    const items = (schema.properties as Record<string, Record<string, unknown>>).tools.items as Record<string, unknown>;
    expect(items.enum).toEqual(TOOL_DEFS.map(t => t.name));
  });

  it('empty tools produces empty enum', () => {
    const schema = buildPlanningSchema([]);
    const items = (schema.properties as Record<string, Record<string, unknown>>).tools.items as Record<string, unknown>;
    expect(items.enum).toEqual([]);
  });

  it('has additionalProperties: false for strict mode', () => {
    const schema = buildPlanningSchema(TOOL_DEFS as unknown as typeof TOOL_DEFS[number][]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('requires tools array', () => {
    const schema = buildPlanningSchema([]);
    expect(schema.required).toEqual(['tools']);
  });
});

describe('buildPlanningPrompt', () => {
  it('includes every tool name and label', () => {
    const ctx = buildSelectionContext(null);
    const tools = TOOL_DEFS as unknown as typeof TOOL_DEFS[number][];
    const prompt = buildPlanningPrompt(ctx, tools);
    for (const tool of TOOL_DEFS) {
      expect(prompt).toContain(tool.name);
      expect(prompt).toContain(tool.label);
    }
  });

  it('reflects canvas type from context', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'mermaid' }) })],
    });
    const ctx = buildSelectionContext(doc);
    const prompt = buildPlanningPrompt(ctx, []);
    expect(prompt).toContain('Canvas: mermaid');
  });

  it('shows empty canvas when no canvas', () => {
    const ctx = buildSelectionContext(null);
    const prompt = buildPlanningPrompt(ctx, []);
    expect(prompt).toContain('Canvas: empty');
  });

  it('shows explanation state', () => {
    const doc = buildDocument({
      sections: [buildSection({ explanation: 'some text' })],
    });
    const ctx = buildSelectionContext(doc);
    const prompt = buildPlanningPrompt(ctx, []);
    expect(prompt).toContain('Explanation: present');
  });

  it('includes section titles when document exists', () => {
    const doc = buildDocument({
      sections: [
        buildSection({ title: 'Introduction' }),
        buildSection({ title: 'Advanced Topics' }),
      ],
    });
    const ctx = buildSelectionContext(doc);
    const prompt = buildPlanningPrompt(ctx, []);
    expect(prompt).toContain('Introduction');
    expect(prompt).toContain('Advanced Topics');
  });
});

describe('parsePlanResult', () => {
  const tools = TOOL_DEFS as unknown as typeof TOOL_DEFS[number][];

  it('valid names return matching entries', () => {
    const result = parsePlanResult({ tools: ['explain', 'challenge'] }, tools);
    expect(result.map(t => t.name)).toEqual(['explain', 'challenge']);
  });

  it('unknown names are filtered out', () => {
    const result = parsePlanResult({ tools: ['explain', 'nonexistent'] }, tools);
    expect(result.map(t => t.name)).toEqual(['explain']);
  });

  it('empty tools array falls back to all', () => {
    const result = parsePlanResult({ tools: [] }, tools);
    expect(result).toEqual(tools);
  });

  it('missing tools key falls back to all', () => {
    const result = parsePlanResult({}, tools);
    expect(result).toEqual(tools);
  });

  it('non-array tools falls back to all', () => {
    const result = parsePlanResult({ tools: 'explain' }, tools);
    expect(result).toEqual(tools);
  });

  it('all-unknown names falls back to all', () => {
    const result = parsePlanResult({ tools: ['fake1', 'fake2'] }, tools);
    expect(result).toEqual(tools);
  });

  it('preserves order from availableTools', () => {
    const result = parsePlanResult({ tools: ['challenge', 'explain'] }, tools);
    const explainIdx = tools.findIndex(t => t.name === 'explain');
    const challengeIdx = tools.findIndex(t => t.name === 'challenge');
    expect(result[0].name).toBe(explainIdx < challengeIdx ? 'explain' : 'challenge');
  });
});
