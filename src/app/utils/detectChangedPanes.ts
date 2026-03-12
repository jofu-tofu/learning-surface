import type { LearningDocument } from '../../shared/types.js';

/** Compare two documents and return which panes changed. */
export function detectChangedPanes(prev: LearningDocument, next: LearningDocument): Set<string> {
  const changed = new Set<string>();
  const prevActive = prev.sections.find(s => s.id === prev.activeSection);
  const nextActive = next.sections.find(s => s.id === next.activeSection);
  if (JSON.stringify(prevActive?.canvas ?? null) !== JSON.stringify(nextActive?.canvas ?? null)) {
    changed.add('canvas');
  }
  if ((prevActive?.explanation ?? null) !== (nextActive?.explanation ?? null) ||
      JSON.stringify(prevActive?.checks ?? []) !== JSON.stringify(nextActive?.checks ?? []) ||
      JSON.stringify(prevActive?.followups ?? []) !== JSON.stringify(nextActive?.followups ?? [])) {
    changed.add('explanation');
  }
  if (prev.sections.length !== next.sections.length) {
    changed.add('sections');
  }
  return changed;
}
