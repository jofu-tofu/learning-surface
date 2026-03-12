import React from 'react';
import type { VersionMeta } from '../../shared/types.js';

export interface TimelineProps {
  versions: VersionMeta[];
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
}

export function Timeline({ versions, currentVersion, onVersionSelect }: TimelineProps): React.ReactElement {
  const currentMeta = versions.find((v) => v.version === currentVersion);

  if (versions.length === 0) {
    return (
      <div className="px-5 py-3">
        <p className="text-xs text-surface-500 italic">No versions yet</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      {/* Version dots with connecting line */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-surface-500 mr-2 shrink-0">v{versions[0]?.version ?? 1}</span>
        <div className="flex items-center flex-1">
          {versions.map((v, i) => {
            const isCurrent = v.version === currentVersion;
            return (
              <React.Fragment key={v.version}>
                {i > 0 && (
                  <div className={`h-0.5 flex-1 min-w-3 max-w-12 ${
                    v.version <= currentVersion ? 'bg-accent-500' : 'bg-surface-600'
                  }`} />
                )}
                <button
                  data-testid={`version-dot-${v.version}`}
                  data-current={isCurrent ? 'true' : undefined}
                  onClick={() => onVersionSelect?.(v.version)}
                  title={v.prompt ? `v${v.version}: ${v.prompt}` : `Version ${v.version}`}
                  className={`
                    shrink-0 rounded-full transition-all cursor-pointer border-2
                    ${isCurrent
                      ? 'w-4 h-4 bg-accent-500 border-accent-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                      : 'w-2.5 h-2.5 border-transparent hover:scale-125'
                    }
                    ${!isCurrent && v.version < currentVersion ? 'bg-accent-600' : ''}
                    ${!isCurrent && v.version > currentVersion ? 'bg-surface-500 hover:bg-surface-400' : ''}
                  `}
                />
              </React.Fragment>
            );
          })}
        </div>
        <span className="text-xs text-surface-500 ml-2 shrink-0">v{versions[versions.length - 1]?.version ?? 1}</span>
      </div>

      {/* Current version info */}
      {currentMeta && (
        <div className="mt-2 flex items-center gap-3 text-xs text-surface-400">
          <span className="font-medium text-surface-300">Version {currentMeta.version}</span>
          {currentMeta.prompt && (
            <>
              <span className="text-surface-600">|</span>
              <span className="truncate">{currentMeta.prompt}</span>
            </>
          )}
          <span className="text-surface-600">|</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
            currentMeta.source === 'ai'
              ? 'bg-accent-600/20 text-accent-400'
              : 'bg-surface-700 text-surface-400'
          }`}>
            {currentMeta.source}
          </span>
        </div>
      )}
    </div>
  );
}
