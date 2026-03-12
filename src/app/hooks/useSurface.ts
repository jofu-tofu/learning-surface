import type { LearningDocument, VersionMeta } from '../../shared/types.js';

export interface UseSurfaceReturn {
  document: LearningDocument | null;
  versions: VersionMeta[];
  currentVersion: number;
  submitPrompt: (text: string) => void;
  selectVersion: (version: number) => void;
  selectSection: (sectionId: string) => void;
}

export function useSurface(): UseSurfaceReturn {
  throw new Error('Not implemented');
}
