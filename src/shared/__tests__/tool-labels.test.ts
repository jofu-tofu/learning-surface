import { describe, it, expect } from 'vitest';
import { getToolLabel, TOOL_LABELS } from '../tool-labels.js';
import { TOOL_DEFS } from '../schemas.js';

describe('getToolLabel', () => {
  it('returns fallback for unknown tool name', () => {
    expect(getToolLabel('some_future_tool')).toBe('some_future_tool');
  });

  it('returns phase label for thinking', () => {
    expect(getToolLabel('thinking')).toBe('Thinking');
  });

  it('returns empty string for empty string input', () => {
    expect(getToolLabel('')).toBe('');
  });

  it('has a label for every TOOL_DEFS entry', () => {
    for (const def of TOOL_DEFS) {
      expect(TOOL_LABELS[def.name]).toBe(def.label);
    }
  });

  it('no longer has planning phase label', () => {
    expect(getToolLabel('planning')).toBe('planning');
  });
});
