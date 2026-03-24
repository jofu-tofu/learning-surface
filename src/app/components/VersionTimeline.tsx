import React, { useState } from 'react';
import type { VersionMeta } from '../../shared/types.js';
import { Breadcrumb } from './Breadcrumb.js';
import { BranchPopover } from './BranchPopover.js';

interface VersionTimelineProps {
  path: VersionMeta[];
  versions: VersionMeta[];
  currentVersion: number;
  forwardPath: VersionMeta[];
  onVersionSelect: (version: number) => void;
}

export function VersionTimeline({ path, versions, currentVersion, forwardPath, onVersionSelect }: VersionTimelineProps): React.ReactElement {
  const [branchPopoverParentVersion, setBranchPopoverParentVersion] = useState<number | null>(null);

  return (
    <div data-testid="pane-timeline" className="shrink-0 border-t border-surface-700/40 bg-surface-800/20 relative">
      <Breadcrumb
        path={path}
        versions={versions}
        currentVersion={currentVersion}
        forwardPath={forwardPath}
        onVersionSelect={onVersionSelect}
        onBranchClick={(v) => setBranchPopoverParentVersion(branchPopoverParentVersion === v ? null : v)}
      />
      {branchPopoverParentVersion !== null && (
        <BranchPopover
          parentVersion={branchPopoverParentVersion}
          versions={versions}
          currentVersion={currentVersion}
          onSelect={onVersionSelect}
          onClose={() => setBranchPopoverParentVersion(null)}
        />
      )}
    </div>
  );
}
