import type { SurfaceState } from './surfaceReducer.js';

interface ChangeDetectionState {
  changedPanes: Set<string>;
  versionChangedPanes: Set<string>;
}

export function useChangeDetection(state: SurfaceState): ChangeDetectionState {
  return {
    changedPanes: state.changedPanes,
    versionChangedPanes: state.versionChangedPanes,
  };
}
