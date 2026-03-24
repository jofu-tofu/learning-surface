import type { Section } from './types.js';

/**
 * Derive the current phase from section data and mode.
 * No state machine — phase is computed from data inspection every time.
 */
export function resolvePhase(section: Section, mode: 'study' | 'answer'): 'predict' | 'explain' {
  if (mode === 'answer') return 'explain';
  if (!section.predictionScaffold) return 'predict';
  const allFilled = section.predictionScaffold.claims.every(c => c.value !== null);
  return allFilled ? 'explain' : 'predict';
}
