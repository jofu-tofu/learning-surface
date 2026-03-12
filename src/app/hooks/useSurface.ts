import { useState, useCallback } from 'react';
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
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);

  const submitPrompt = useCallback((_text: string) => {
    // TODO: send prompt to server
  }, []);

  const selectVersion = useCallback((version: number) => {
    setCurrentVersion(version);
  }, []);

  const selectSection = useCallback((_sectionId: string) => {
    // TODO: update active section
  }, []);

  // Suppress unused setter warnings
  void setDocument;
  void setVersions;

  return {
    document,
    versions,
    currentVersion,
    submitPrompt,
    selectVersion,
    selectSection,
  };
}
