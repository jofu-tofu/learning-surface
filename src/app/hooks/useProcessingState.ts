import type { ToolActivity, SurfaceState } from './surfaceReducer.js';

interface ProcessingState {
  isProcessing: boolean;
  activity: ToolActivity | null;
}

export function useProcessingState(state: SurfaceState): ProcessingState {
  return { isProcessing: state.isProcessing, activity: state.activity };
}
