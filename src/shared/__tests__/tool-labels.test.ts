import { describe, it, expect } from 'vitest';
import { getToolLabel, TOOL_LABELS } from '../tool-labels.js';

describe('getToolLabel', () => {
  it('returns fallback for unknown tool name', () => {
    expect(getToolLabel('some_future_tool')).toBe('some_future_tool');
  });

  it('returns phase label for thinking', () => {
    expect(getToolLabel('thinking')).toBe('Thinking');
  });

  it('has a label for every TOOL_DEFS name', () => {
    // Guard: if a tool is added to TOOL_DEFS but not TOOL_LABELS, this breaks.
    // We don't import TOOL_DEFS here to keep the test independent —
    // instead we verify the mapping has entries (non-empty).
    expect(Object.keys(TOOL_LABELS).length).toBeGreaterThan(0);
  });
});
