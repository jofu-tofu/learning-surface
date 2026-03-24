import { describe, it, expect } from 'vitest';
import { getSecondPane, getAllSecondPaneIds } from '../registry.js';

describe('pane registry', () => {
  it('returns undefined for unregistered phase', () => {
    expect(getSecondPane('nonexistent')).toBeUndefined();
  });

  it('returns explanation entry for explain phase', () => {
    const entry = getSecondPane('explain');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('explanation');
    expect(entry!.title).toBe('Explanation');
  });

  it('returns prediction entry for predict phase', () => {
    const entry = getSecondPane('predict');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('prediction');
    expect(entry!.title).toBe('Prediction');
  });

  it('getAllSecondPaneIds returns deduped IDs', () => {
    const ids = getAllSecondPaneIds();
    expect(ids).toContain('explanation');
    expect(ids).toContain('prediction');
    expect(ids).toHaveLength(new Set(ids).size);
  });
});
