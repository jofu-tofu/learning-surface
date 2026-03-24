import React, { createContext, useContext, useMemo } from 'react';

export interface SurfaceActions {
  /** Submit a text prompt (used by followups, future interactive elements). */
  submitPrompt: (text: string) => void;
  /** Submit structured responses for a section (used by prediction claims, future interactive checks). */
  submitResponse: (sectionId: string, responses: Record<string, string>) => void;
}

const SurfaceActionsContext = createContext<SurfaceActions | null>(null);

export function SurfaceActionsProvider({ value, children }: { value: SurfaceActions; children: React.ReactNode }): React.ReactElement {
  const memoized = useMemo(() => value, [value.submitPrompt, value.submitResponse]);
  return <SurfaceActionsContext value={memoized}>{children}</SurfaceActionsContext>;
}

export function useSurfaceActions(): SurfaceActions {
  const ctx = useContext(SurfaceActionsContext);
  if (!ctx) throw new Error('useSurfaceActions must be used within a SurfaceActionsProvider');
  return ctx;
}
