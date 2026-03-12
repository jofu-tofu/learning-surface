import React, { useEffect, useRef } from 'react';
import type { VersionMeta } from '../../shared/types.js';
import { getChildren } from '../../shared/version-tree.js';
import { formatTime } from '../utils/formatTime.js';
import { VersionDot } from './VersionDot.js';

export interface BranchPopoverProps {
  parentVersion: number;
  versions: VersionMeta[];
  currentVersion: number;
  onSelect: (version: number) => void;
  onClose: () => void;
}

export function BranchPopover({
  parentVersion,
  versions,
  currentVersion,
  onSelect,
  onClose,
}: BranchPopoverProps): React.ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const children = getChildren(parentVersion, versions);

  return (
    <div className="relative z-50" ref={panelRef}>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-56 rounded-lg border border-surface-600 bg-surface-800 shadow-xl">
        <div className="px-3 pt-2.5 pb-1.5">
          <span className="text-[10px] font-semibold tracking-wider text-surface-500 uppercase">
            Explorations from here
          </span>
        </div>
        <div className="px-1.5 pb-1.5">
          {children.map(v => {
            const isActive = v.version === currentVersion;
            const label = v.summary || v.prompt || `Step ${v.version}`;

            return (
              <button
                key={v.version}
                data-testid={`branch-option-${v.version}`}
                onClick={() => { onSelect(v.version); onClose(); }}
                className={`
                  w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer
                  ${isActive
                    ? 'text-accent-300 bg-accent-600/10'
                    : 'text-surface-400 hover:bg-surface-700/60 hover:text-surface-300'
                  }
                `}
              >
                <VersionDot isCurrent={isActive} source={v.source} />
                <span className="truncate flex-1 text-left">{label}</span>
                {v.timestamp && (
                  <span className="shrink-0 text-[10px] text-surface-500">{formatTime(v.timestamp)}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-surface-600" />
      </div>
    </div>
  );
}
