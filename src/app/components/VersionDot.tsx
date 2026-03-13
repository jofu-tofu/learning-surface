import React from 'react';

interface VersionDotProps {
  isCurrent: boolean;
  source: string;
}

export function VersionDot({ isCurrent, source }: VersionDotProps): React.ReactElement {
  return (
    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
      isCurrent ? 'bg-accent-400' : source === 'ai' ? 'bg-emerald-500' : 'bg-surface-500'
    }`} />
  );
}
