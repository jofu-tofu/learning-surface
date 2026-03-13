import React from 'react';
import { sectionHeading } from '../utils/styles.js';

interface PaneHeaderProps {
  title: string;
  isProcessing?: boolean;
}

export function PaneHeader({ title, isProcessing }: PaneHeaderProps): React.ReactElement {
  return (
    <div className="relative px-5 py-3 border-b border-surface-700/50 bg-surface-800/40">
      <h2 className={sectionHeading}>{title}</h2>
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="pane-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-accent-400/60 to-transparent" />
        </div>
      )}
    </div>
  );
}
