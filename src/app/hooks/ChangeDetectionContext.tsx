import React, { createContext, useContext, useMemo } from 'react';

interface ChangeDetectionValue {
  flashPanes: Set<string>;
  versionChangedPanes: Set<string>;
  changedSectionIds: Set<string>;
  flashSectionIds: Set<string>;
}

const EMPTY: ChangeDetectionValue = {
  flashPanes: new Set(),
  versionChangedPanes: new Set(),
  changedSectionIds: new Set(),
  flashSectionIds: new Set(),
};

const ChangeDetectionContext = createContext<ChangeDetectionValue>(EMPTY);

export function ChangeDetectionProvider({ children, ...value }: ChangeDetectionValue & { children: React.ReactNode }): React.ReactElement {
  const memoized = useMemo(
    () => ({ flashPanes: value.flashPanes, versionChangedPanes: value.versionChangedPanes, changedSectionIds: value.changedSectionIds, flashSectionIds: value.flashSectionIds }),
    [value.flashPanes, value.versionChangedPanes, value.changedSectionIds, value.flashSectionIds],
  );
  return <ChangeDetectionContext value={memoized}>{children}</ChangeDetectionContext>;
}

export function usePaneFlash(paneId: string): boolean {
  return useContext(ChangeDetectionContext).flashPanes.has(paneId);
}

export function usePaneChanged(paneId: string): boolean {
  return useContext(ChangeDetectionContext).versionChangedPanes.has(paneId);
}

export function useChangedSectionIds(): Set<string> {
  return useContext(ChangeDetectionContext).changedSectionIds;
}

export function useFlashSectionIds(): Set<string> {
  return useContext(ChangeDetectionContext).flashSectionIds;
}
