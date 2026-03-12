import React from 'react';
import type { VersionMeta } from '../../shared/types.js';

export interface TimelineProps {
  versions: VersionMeta[];
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
}

export function Timeline({ versions, currentVersion, onVersionSelect }: TimelineProps): React.ReactElement {
  const currentMeta = versions.find((v) => v.version === currentVersion);

  return (
    <div>
      <div>
        {versions.map((v) => (
          <button
            key={v.version}
            data-testid={`version-dot-${v.version}`}
            data-current={v.version === currentVersion ? 'true' : undefined}
            onClick={() => onVersionSelect?.(v.version)}
          />
        ))}
      </div>
      {currentMeta?.prompt && <div>{currentMeta.prompt}</div>}
    </div>
  );
}
