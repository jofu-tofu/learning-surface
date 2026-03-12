import React from 'react';
import type { VersionMeta } from '../../shared/types.js';
import { getChildren } from '../../shared/version-tree.js';
import { getVersionLabel } from '../utils/versionLabel.js';
import { VersionDot } from './VersionDot.js';

export interface BreadcrumbProps {
  path: VersionMeta[];
  versions: VersionMeta[];
  currentVersion: number;
  forwardPath?: VersionMeta[];
  onVersionSelect?: (version: number) => void;
  onBranchClick?: (version: number) => void;
}

export function Breadcrumb({
  path,
  versions,
  currentVersion,
  forwardPath = [],
  onVersionSelect,
  onBranchClick,
}: BreadcrumbProps): React.ReactElement {
  if (path.length === 0 && forwardPath.length === 0) {
    return (
      <div data-testid="breadcrumb" className="px-5 py-3">
        <p className="text-xs text-surface-500 italic">No history yet — send a prompt to begin</p>
      </div>
    );
  }

  const renderCrumb = (v: VersionMeta, idx: number, isCurrent: boolean, faded: boolean) => {
    const label = getVersionLabel(v, v.version === 1 || (idx === 0 && !faded));
    const branches = getChildren(v.version, versions).length;

    return (
      <React.Fragment key={v.version}>
        {(idx > 0 || faded) && (
          <span className="shrink-0 text-surface-600/60 text-xs select-none">›</span>
        )}
        <button
          data-testid={`crumb-${v.version}`}
          onClick={() => onVersionSelect?.(v.version)}
          className={`
            shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer border
            focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400
            ${faded ? 'opacity-35' : ''}
            ${isCurrent
              ? 'bg-accent-600/15 border-accent-500/30 text-accent-300 shadow-sm shadow-accent-500/5'
              : 'bg-surface-800/40 border-surface-700/60 text-surface-400 hover:bg-surface-700/40 hover:text-surface-300 hover:border-surface-600'
            }
          `}
        >
          <VersionDot isCurrent={isCurrent} source={v.source} />
          <span className="truncate max-w-40">{label}</span>
          {branches > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBranchClick?.(v.version); }}
              className="shrink-0 ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-medium bg-purple-500/20 border border-purple-500/30 text-purple-400 cursor-pointer hover:bg-purple-500/30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
              aria-label={`Show ${branches} branches from version ${v.version}`}
            >
              {branches}
            </button>
          )}
        </button>
      </React.Fragment>
    );
  };

  return (
    <div data-testid="breadcrumb" className="px-5 py-2.5">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] font-semibold tracking-widest text-surface-500/70 uppercase select-none">
          Path
        </span>
        {path.map((v, i) => renderCrumb(v, i, v.version === currentVersion, false))}
        {forwardPath.map((v, i) => renderCrumb(v, i, false, true))}
      </div>
    </div>
  );
}
