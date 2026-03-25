import { useMemo, useCallback } from 'react';
import type { LearningDocument } from '../../shared/document.js';
import type { VersionMeta } from '../../shared/session.js';
import { getVersionPath, getForwardPath } from '../../shared/version-tree.js';
import type { SurfaceState } from './surfaceReducer.js';

type SetState = React.Dispatch<React.SetStateAction<SurfaceState>>;
type SendFn = (data: unknown) => void;

interface DocumentActions {
  document: LearningDocument | null;
  versions: VersionMeta[];
  currentVersion: number;
  path: VersionMeta[];
  forwardPath: VersionMeta[];
  selectVersion: (version: number) => void;
}

export function useDocumentActions(state: SurfaceState, setState: SetState, send: SendFn): DocumentActions {
  const { document, versions, currentVersion } = state;

  const path = useMemo(() => getVersionPath(currentVersion, versions), [currentVersion, versions]);
  const forwardPath = useMemo(() => getForwardPath(currentVersion, versions), [currentVersion, versions]);

  const selectVersion = useCallback((version: number) => {
    setState(prevState => ({ ...prevState, currentVersion: version }));
    send({ type: 'select-version', version });
  }, [setState, send]);

  return { document, versions, currentVersion, path, forwardPath, selectVersion };
}
