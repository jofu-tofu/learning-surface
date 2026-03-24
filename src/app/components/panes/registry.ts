import type React from 'react';
import type { Section } from '../../../shared/types.js';

/** Standard props every second-pane component receives. */
export interface SecondPaneProps {
  section: Section | undefined;
}

/** Registry entry for a second-pane component. */
export interface SecondPaneEntry {
  id: string;
  title: string;
  component: React.ComponentType<SecondPaneProps>;
}

// --- Registry internals ---
const registry = new Map<string, SecondPaneEntry>();

function registerSecondPane(phase: string, entry: SecondPaneEntry): void {
  registry.set(phase, entry);
}

/** Look up the second pane for a given phase. Returns undefined if no pane registered. */
export function getSecondPane(phase: string): SecondPaneEntry | undefined {
  return registry.get(phase);
}

/** All registered second-pane IDs (for scroll ref initialization). */
export function getAllSecondPaneIds(): string[] {
  return [...new Set([...registry.values()].map(e => e.id))];
}

// --- Built-in panes (explicit, like renderer registry) ---
import { Explanation } from '../Explanation.js';
import { Prediction } from '../Prediction.js';

registerSecondPane('explain', { id: 'explanation', title: 'Explanation', component: Explanation });
registerSecondPane('predict', { id: 'prediction', title: 'Prediction', component: Prediction });
