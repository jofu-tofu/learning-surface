import React from 'react';
import { useIsProcessing, useActivity } from '../hooks/VersionDiffContext.js';

const isDev = import.meta.env.DEV;

export function ActivityStatus(): React.ReactElement | null {
  const isProcessing = useIsProcessing();
  const activity = useActivity();

  if (!isProcessing || !activity) return null;

  return (
    <div className="flex items-center gap-2 px-5 py-1.5 text-xs text-surface-400 bg-surface-800/40 border-t border-surface-700/30 select-none">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
      <span className="text-surface-300">{activity.label}...</span>
      {isDev && (
        <span className="ml-auto font-mono text-[10px] text-surface-600">
          {activity.toolName}
          {activity.step > 0 && <span className="text-surface-500"> step {activity.step}</span>}
        </span>
      )}
    </div>
  );
}
