import React, { createContext, useContext, useMemo } from 'react';
import type { ToolActivity } from './surfaceReducer.js';

interface ProcessingValue {
  isProcessing: boolean;
  activity: ToolActivity | null;
}

const EMPTY: ProcessingValue = { isProcessing: false, activity: null };

const ProcessingContext = createContext<ProcessingValue>(EMPTY);

export function ProcessingProvider({ isProcessing, activity, children }: ProcessingValue & { children: React.ReactNode }): React.ReactElement {
  const value = useMemo(() => ({ isProcessing, activity }), [isProcessing, activity]);
  return <ProcessingContext value={value}>{children}</ProcessingContext>;
}

export function useIsProcessing(): boolean {
  return useContext(ProcessingContext).isProcessing;
}

export function useActivity(): ToolActivity | null {
  return useContext(ProcessingContext).activity;
}
