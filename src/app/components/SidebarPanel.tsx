import React from 'react';
import { sectionHeading } from '../utils/styles.js';

interface SidebarPanelProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function SidebarPanel({ title, className = '', children }: SidebarPanelProps): React.ReactElement {
  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="px-4 py-3 border-b border-surface-700/30">
        <h2 className={sectionHeading}>{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {children}
      </div>
    </div>
  );
}
