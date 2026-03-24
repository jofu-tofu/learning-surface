import { useCallback } from 'react';
import type { SurfaceState } from './surfaceReducer.js';

type SetState = React.Dispatch<React.SetStateAction<SurfaceState>>;

interface StudyModeState {
  studyMode: boolean;
  studyModeLocked: boolean;
  setStudyMode: (enabled: boolean) => void;
}

export function useStudyMode(state: SurfaceState, setState: SetState): StudyModeState {
  const { studyMode, studyModeLocked } = state;

  const setStudyMode = useCallback((enabled: boolean) => {
    setState(prevState => {
      if (prevState.studyModeLocked) return prevState;
      return { ...prevState, studyMode: enabled };
    });
  }, [setState]);

  return { studyMode, studyModeLocked, setStudyMode };
}
