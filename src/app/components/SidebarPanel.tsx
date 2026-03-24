import React from 'react';
import { sectionHeading } from '../utils/styles.js';

interface SidebarPanelProps {
  title: string;
  className?: string;
  /** Optional action element rendered to the right of the title. */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarPanel({ title, className = '', headerAction, children }: SidebarPanelProps): React.ReactElement {
  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="flex items-center px-4 py-3 border-b border-surface-700/30">
        <h2 className={`${sectionHeading} flex-1`}>{title}</h2>
        {headerAction}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {children}
      </div>
    </div>
  );
}
