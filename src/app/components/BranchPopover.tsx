import React, { useRef } from 'react';
import type { VersionMeta } from '../../shared/types.js';
import { getChildren } from '../../shared/version-tree.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { formatTime } from '../utils/formatTime.js';
import { getVersionLabel } from '../utils/versionLabel.js';
import { focusRing, popoverPanel, sectionLabel, menuItemActive, menuItemInactive } from '../utils/styles.js';
import { VersionDot } from './VersionDot.js';

interface BranchPopoverProps {
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

  useClickOutside(panelRef, onClose);

  const children = getChildren(parentVersion, versions);

  return (
    <div className="relative z-50" ref={panelRef}>
      <div className={`${popoverPanel} min-w-56`}>
        <div className="px-3 pt-2.5 pb-1.5">
          <span className={`${sectionLabel} select-none`}>
            Explorations from here
          </span>
        </div>
        <div className="px-1.5 pb-1.5">
          {children.map(v => {
            const isActive = v.version === currentVersion;
            const label = getVersionLabel(v);

            return (
              <button
                key={v.version}
                data-testid={`branch-option-${v.version}`}
                onClick={() => { onSelect(v.version); onClose(); }}
                className={`
                  w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer
                  ${focusRing}
                  ${isActive ? menuItemActive : menuItemInactive}
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
