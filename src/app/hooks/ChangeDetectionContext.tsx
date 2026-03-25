import React, { createContext, useContext, useMemo } from 'react';

interface ChangeDetectionValue {
  flashPanes: Set<string>;
  versionChangedPanes: Set<string>;
}

const EMPTY: ChangeDetectionValue = {
  flashPanes: new Set(),
  versionChangedPanes: new Set(),
};

const ChangeDetectionContext = createContext<ChangeDetectionValue>(EMPTY);

export function ChangeDetectionProvider({ children, ...value }: ChangeDetectionValue & { children: React.ReactNode }): React.ReactElement {
  const memoized = useMemo(
    () => ({ flashPanes: value.flashPanes, versionChangedPanes: value.versionChangedPanes }),
    [value.flashPanes, value.versionChangedPanes],
  );
  return <ChangeDetectionContext value={memoized}>{children}</ChangeDetectionContext>;
}

export function usePaneFlash(paneId: string): boolean {
  return useContext(ChangeDetectionContext).flashPanes.has(paneId);
}

export function usePaneChanged(paneId: string): boolean {
  return useContext(ChangeDetectionContext).versionChangedPanes.has(paneId);
}
