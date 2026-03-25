import type { LearningDocument } from './document.js';

/** Compare two documents and return which panes changed ('canvas' or 'blocks'). */
export function detectChangedPanes(prev: LearningDocument, next: LearningDocument): Set<string> {
  const changed = new Set<string>();

  if (JSON.stringify(prev.canvases) !== JSON.stringify(next.canvases)) {
    changed.add('canvas');
  }
  if (JSON.stringify(prev.blocks) !== JSON.stringify(next.blocks)) {
    changed.add('blocks');
  }

  return changed;
}
