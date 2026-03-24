import type { SurfaceState } from './surfaceReducer.js';

interface ChangeDetectionState {
  changedPanes: Set<string>;
  versionChangedPanes: Set<string>;
  changedSectionIds: Set<string>;
  flashSectionIds: Set<string>;
}

export function useChangeDetection(state: SurfaceState): ChangeDetectionState {
  return {
    changedPanes: state.changedPanes,
    versionChangedPanes: state.versionChangedPanes,
    changedSectionIds: state.changedSectionIds,
    flashSectionIds: state.flashSectionIds,
  };
}
