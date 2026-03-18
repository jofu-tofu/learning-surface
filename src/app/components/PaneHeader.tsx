import React from 'react';
import { sectionHeading, updatedBadge } from '../utils/styles.js';
import { usePaneChanged, useIsProcessing } from '../hooks/SurfaceStatusContext.js';

interface PaneHeaderProps {
  paneId: string;
  title: string;
  actions?: React.ReactNode;
}

export function PaneHeader({ paneId, title, actions }: PaneHeaderProps): React.ReactElement {
  const changed = usePaneChanged(paneId);
  const isProcessing = useIsProcessing();

  return (
    <div className="relative px-5 py-3 border-b border-surface-700/50 bg-surface-800/40">
      <div className="flex items-center gap-2.5">
        <h2 className={sectionHeading}>{title}</h2>
        {changed && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-500/15 text-accent-400 border border-accent-500/20 ${updatedBadge}`}>
            Updated
          </span>
        )}
        {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
      </div>
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="pane-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-accent-400/60 to-transparent" />
        </div>
      )}
    </div>
  );
}
