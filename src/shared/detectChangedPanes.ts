import type { LearningDocument, Section } from './types.js';

/** Section keys that are metadata, not renderable content. */
const META_KEYS = new Set(['id', 'title']);

/** Map Section content keys → pane IDs. Unmapped keys default to their own name. */
export const CONTENT_KEY_TO_PANE: Record<string, string> = {
  canvases: 'canvas',
  explanation: 'explanation',
  checks: 'explanation',      // grouped: checks render inside explanation pane
  followups: 'explanation',   // grouped: followups render inside explanation pane
};

function contentKeyToPane(key: string): string {
  return CONTENT_KEY_TO_PANE[key] ?? key;
}

/** Collect all non-meta keys present on either section. */
function allContentKeys(sectionA: Section | undefined, sectionB: Section | undefined): Set<string> {
  const keys = new Set<string>();
  for (const section of [sectionA, sectionB]) {
    if (!section) continue;
    for (const key of Object.keys(section)) {
      if (!META_KEYS.has(key)) keys.add(key);
    }
  }
  return keys;
}

/** Compare two documents and return which panes changed. */
export function detectChangedPanes(prev: LearningDocument, next: LearningDocument): Set<string> {
  const changed = new Set<string>();
  const prevActive = prev.sections.find(section => section.id === prev.activeSection);
  const nextActive = next.sections.find(section => section.id === next.activeSection);

  for (const key of allContentKeys(prevActive, nextActive)) {
    const prevVal = (prevActive as unknown as Record<string, unknown>)?.[key] ?? null;
    const nextVal = (nextActive as unknown as Record<string, unknown>)?.[key] ?? null;
    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      changed.add(contentKeyToPane(key));
    }
  }

  if (prev.sections.length !== next.sections.length) {
    changed.add('sections');
  }
  return changed;
}

/** Return true if a section's content differs from another. */
function sectionContentChanged(prevSection: Section, nextSection: Section): boolean {
  for (const key of allContentKeys(prevSection, nextSection)) {
    const prevVal = (prevSection as unknown as Record<string, unknown>)[key] ?? null;
    const nextVal = (nextSection as unknown as Record<string, unknown>)[key] ?? null;
    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      return true;
    }
  }
  return false;
}

/** Compare all sections between two documents and return IDs of sections that were added or modified. */
export function detectChangedSections(prev: LearningDocument, next: LearningDocument): Set<string> {
  const changed = new Set<string>();
  const prevById = new Map(prev.sections.map(section => [section.id, section]));
  for (const section of next.sections) {
    const prevSection = prevById.get(section.id);
    if (!prevSection || sectionContentChanged(prevSection, section)) {
      changed.add(section.id);
    }
  }
  return changed;
}
