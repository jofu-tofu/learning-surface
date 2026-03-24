import { describe, it, expect } from 'vitest';
import { resolvePhase } from '../phase.js';
import { buildSection } from '../../test/helpers.js';

describe('resolvePhase', () => {
  it('answer mode returns explain even with unfilled scaffold', () => {
    const section = buildSection({
      predictionScaffold: {
        question: 'What happens?',
        claims: [{ id: 'c1', prompt: 'Claim 1', type: 'free-text', value: null }],
      },
    });
    expect(resolvePhase(section, 'answer')).toBe('explain');
  });

  it('study mode with no predictionScaffold returns predict (AI must generate scaffold first)', () => {
    const section = buildSection();
    expect(resolvePhase(section, 'study')).toBe('predict');
  });

  it('study mode with empty claims array returns explain', () => {
    const section = buildSection({
      predictionScaffold: { question: 'What happens?', claims: [] },
    });
    expect(resolvePhase(section, 'study')).toBe('explain');
  });

  it('study mode with all claims null returns predict', () => {
    const section = buildSection({
      predictionScaffold: {
        question: 'What happens?',
        claims: [
          { id: 'c1', prompt: 'Claim 1', type: 'free-text', value: null },
          { id: 'c2', prompt: 'Claim 2', type: 'choice', options: ['a', 'b'], value: null },
        ],
      },
    });
    expect(resolvePhase(section, 'study')).toBe('predict');
  });

  it('study mode with some claims filled and some null returns predict', () => {
    const section = buildSection({
      predictionScaffold: {
        question: 'What happens?',
        claims: [
          { id: 'c1', prompt: 'Claim 1', type: 'free-text', value: 'my answer' },
          { id: 'c2', prompt: 'Claim 2', type: 'free-text', value: null },
        ],
      },
    });
    expect(resolvePhase(section, 'study')).toBe('predict');
  });

  it('study mode with all claims filled returns explain', () => {
    const section = buildSection({
      predictionScaffold: {
        question: 'What happens?',
        claims: [
          { id: 'c1', prompt: 'Claim 1', type: 'free-text', value: 'answer 1' },
          { id: 'c2', prompt: 'Claim 2', type: 'choice', options: ['a', 'b'], value: 'a' },
        ],
      },
    });
    expect(resolvePhase(section, 'study')).toBe('explain');
  });
});
