import { describe, it, expect } from 'vitest';
import { parseProofData } from '../proof-layout.js';

describe('parseProofData', () => {
  it('returns null for invalid JSON', () => {
    expect(parseProofData('not json')).toBeNull();
  });

  it('returns null when steps is not an array', () => {
    expect(parseProofData('{"steps":"not-array"}')).toBeNull();
  });

  it('returns null when step is missing expression', () => {
    expect(parseProofData('{"steps":[{"justification":"by def"}]}')).toBeNull();
  });

  it('returns null when step is missing justification', () => {
    expect(parseProofData('{"steps":[{"expression":"x=1"}]}')).toBeNull();
  });

  it('parses valid proof with no title or premises', () => {
    const data = parseProofData(JSON.stringify({
      steps: [{ expression: 'x=1', justification: 'given' }],
    }));
    expect(data).not.toBeNull();
    expect(data!.steps).toHaveLength(1);
    expect(data!.title).toBeUndefined();
    expect(data!.premises).toBeUndefined();
  });

  it('parses empty steps array', () => {
    const data = parseProofData('{"steps":[]}');
    expect(data).not.toBeNull();
    expect(data!.steps).toEqual([]);
  });
});
