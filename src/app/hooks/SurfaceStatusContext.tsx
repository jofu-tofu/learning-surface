import React, { createContext, useContext } from 'react';
import type { ToolActivity } from './surfaceReducer.js';

interface SurfaceStatusValue {
  /** True from prompt submission until updates settle. */
  isProcessing: boolean;
  /** Pane IDs that flashed in the most recent streaming update (1.2s lifetime). */
  flashPanes: Set<string>;
  /** Pane IDs that changed in the current version vs the previous version. */
  versionChangedPanes: Set<string>;
  /** Section IDs that were added or modified in the current version. */
  changedSectionIds: Set<string>;
  /** Section IDs that changed in the most recent streaming update (1.2s flash lifetime). */
  flashSectionIds: Set<string>;
  /** Current tool-call activity during processing. */
  activity: ToolActivity | null;
}

const EMPTY: SurfaceStatusValue = {
  isProcessing: false,
  flashPanes: new Set(),
  versionChangedPanes: new Set(),
  changedSectionIds: new Set(),
  flashSectionIds: new Set(),
  activity: null,
};

const SurfaceStatusContext = createContext<SurfaceStatusValue>(EMPTY);

export function SurfaceStatusProvider({ children, ...value }: SurfaceStatusValue & { children: React.ReactNode }): React.ReactElement {
  const memo = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity of Sets changes per render; the provider sits at the root so this is fine
    [value.isProcessing, value.flashPanes, value.versionChangedPanes, value.changedSectionIds, value.flashSectionIds, value.activity],
  );
  return <SurfaceStatusContext value={memo}>{children}</SurfaceStatusContext>;
}

export function useIsProcessing(): boolean {
  return useContext(SurfaceStatusContext).isProcessing;
}

export function useActivity(): ToolActivity | null {
  return useContext(SurfaceStatusContext).activity;
}

/** Check whether a specific pane has a streaming-update flash active. */
export function usePaneFlash(paneId: string): boolean {
  return useContext(SurfaceStatusContext).flashPanes.has(paneId);
}

/** Check whether a specific pane changed in the current version. */
export function usePaneChanged(paneId: string): boolean {
  return useContext(SurfaceStatusContext).versionChangedPanes.has(paneId);
}

/** Get the full set of changed section IDs. */
export function useChangedSectionIds(): Set<string> {
  return useContext(SurfaceStatusContext).changedSectionIds;
}

/** Get the set of section IDs that changed in the most recent streaming update (1.2s flash). */
export function useFlashSectionIds(): Set<string> {
  return useContext(SurfaceStatusContext).flashSectionIds;
}
