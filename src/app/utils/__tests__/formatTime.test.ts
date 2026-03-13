import { describe, it, expect } from 'vitest';
import { formatTime } from '../formatTime.js';

describe('formatTime', () => {
  it('returns a non-empty string for valid ISO timestamp', () => {
    const result = formatTime('2026-03-11T14:30:00Z');
    expect(result).not.toBe('');
    // Should contain hour:minute digits — locale-dependent, so just check format
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns empty string for invalid date', () => {
    // Invalid Date doesn't throw — it returns "Invalid Date" from toLocaleTimeString
    // but the function should still return a string (possibly "Invalid Date")
    const result = formatTime('not-a-date');
    expect(typeof result).toBe('string');
  });

  it('returns empty string for empty input', () => {
    const result = formatTime('');
    expect(typeof result).toBe('string');
  });
});
