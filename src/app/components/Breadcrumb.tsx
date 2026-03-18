import React from 'react';
import type { VersionMeta } from '../../shared/types.js';
import { getChildren } from '../../shared/version-tree.js';
import { getVersionLabel } from '../utils/versionLabel.js';
import { focusRing, sectionLabel } from '../utils/styles.js';
import { VersionDot } from './VersionDot.js';

interface BreadcrumbProps {
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

  const renderCrumb = (versionMeta: VersionMeta, crumbIndex: number, isCurrent: boolean, faded: boolean) => {
    const label = getVersionLabel(versionMeta, versionMeta.version === 1 || (crumbIndex === 0 && !faded));
    const branches = getChildren(versionMeta.version, versions).length;

    return (
      <React.Fragment key={versionMeta.version}>
        {(crumbIndex > 0 || faded) && (
          <span className="shrink-0 text-surface-600/60 text-xs select-none">›</span>
        )}
        <button
          data-testid={`crumb-${versionMeta.version}`}
          onClick={() => onVersionSelect?.(versionMeta.version)}
          className={`
            shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer border
            ${focusRing}
            ${faded ? 'opacity-35' : ''}
            ${isCurrent
              ? 'bg-accent-600/15 border-accent-500/30 text-accent-400 shadow-sm shadow-accent-500/5'
              : 'bg-surface-800/40 border-surface-700/60 text-surface-400 hover:bg-surface-700/40 hover:text-surface-300 hover:border-surface-600'
            }
          `}
        >
          <VersionDot isCurrent={isCurrent} source={versionMeta.source} />
          <span className="truncate max-w-40">{label}</span>
          {branches > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBranchClick?.(versionMeta.version); }}
              className={`shrink-0 ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-medium bg-branch-bg border border-branch-border text-branch-text cursor-pointer hover:bg-branch-bg/80 ${focusRing}`}
              aria-label={`Show ${branches} branches from version ${versionMeta.version}`}
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
        <span className={`shrink-0 ${sectionLabel} select-none`}>
          Path
        </span>
        {path.map((versionMeta, crumbIndex) => renderCrumb(versionMeta, crumbIndex, versionMeta.version === currentVersion, false))}
        {forwardPath.map((versionMeta, crumbIndex) => renderCrumb(versionMeta, crumbIndex, false, true))}
      </div>
    </div>
  );
}
