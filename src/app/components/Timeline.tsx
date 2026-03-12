import React from 'react';
import type { VersionMeta } from '../../shared/types.js';

export interface TimelineProps {
  versions: VersionMeta[];
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function Timeline({ versions, currentVersion, onVersionSelect }: TimelineProps): React.ReactElement {
  if (versions.length === 0) {
    return (
      <div className="px-5 py-3">
        <p className="text-xs text-surface-500 italic">No history yet — send a prompt to begin</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-2.5">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {versions.map((v, i) => {
          const isCurrent = v.version === currentVersion;
          const label = v.prompt || (i === 0 ? 'Initial' : `Step ${v.version}`);

          return (
            <React.Fragment key={v.version}>
              {i > 0 && (
                <svg className="shrink-0 w-4 h-4 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              <button
                data-testid={`version-dot-${v.version}`}
                data-current={isCurrent ? 'true' : undefined}
                onClick={() => onVersionSelect?.(v.version)}
                className={`
                  shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border
                  ${isCurrent
                    ? 'bg-accent-600/20 border-accent-500/40 text-accent-300'
                    : 'bg-surface-800/50 border-surface-700 text-surface-400 hover:bg-surface-700/50 hover:text-surface-300'
                  }
                `}
              >
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                  isCurrent ? 'bg-accent-400' : v.source === 'ai' ? 'bg-emerald-500' : 'bg-surface-500'
                }`} />
                <span className="truncate max-w-40">{label}</span>
                {v.timestamp && (
                  <span className="text-[10px] text-surface-500 shrink-0">{formatTime(v.timestamp)}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
