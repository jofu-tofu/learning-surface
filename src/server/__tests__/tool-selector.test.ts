import { describe, it, expect } from 'vitest';
import { selectTools } from '../tool-selector.js';

describe('selectTools', () => {
  it('returns design_surface as the only tool', () => {
    const tools = selectTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('design_surface');
  });
});
