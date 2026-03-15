import React from 'react';

export function LoadingSpinner({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 text-sm text-surface-400">
      <div className="w-4 h-4 border-2 border-surface-500 border-t-accent-400 rounded-full animate-spin" />
      {label}
    </div>
  );
}
