import React from 'react';
import { sectionHeading } from '../utils/styles.js';

export interface PaneHeaderProps {
  title: string;
}

export function PaneHeader({ title }: PaneHeaderProps): React.ReactElement {
  return (
    <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/40">
      <h2 className={sectionHeading}>{title}</h2>
    </div>
  );
}
