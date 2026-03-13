import type { LearningDocument, Section } from '../../shared/types.js';

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

/** Return true if a section's content differs from another. */
function sectionContentChanged(a: Section, b: Section): boolean {
  return JSON.stringify(a.canvas ?? null) !== JSON.stringify(b.canvas ?? null) ||
    (a.explanation ?? null) !== (b.explanation ?? null) ||
    JSON.stringify(a.checks ?? []) !== JSON.stringify(b.checks ?? []) ||
    JSON.stringify(a.followups ?? []) !== JSON.stringify(b.followups ?? []);
}

/** Compare all sections between two documents and return IDs of sections that were added or modified. */
export function detectChangedSections(prev: LearningDocument, next: LearningDocument): Set<string> {
  const changed = new Set<string>();
  const prevById = new Map(prev.sections.map(s => [s.id, s]));
  for (const section of next.sections) {
    const prevSection = prevById.get(section.id);
    if (!prevSection || sectionContentChanged(prevSection, section)) {
      changed.add(section.id);
    }
  }
  return changed;
}
