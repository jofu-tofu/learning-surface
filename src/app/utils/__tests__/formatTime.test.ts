import { describe, it, expect } from 'vitest';
import { formatTime } from '../formatTime.js';

describe('formatTime', () => {
  it('returns a non-empty string for valid ISO timestamp', () => {
    const result = formatTime('2026-03-11T14:30:00Z');
    expect(result).not.toBe('');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('does not throw on invalid date string', () => {
    expect(() => formatTime('not-a-date')).not.toThrow();
  });

  it('does not throw on empty string', () => {
    expect(() => formatTime('')).not.toThrow();
  });
});
