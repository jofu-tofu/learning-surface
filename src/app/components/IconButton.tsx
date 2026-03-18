import React from 'react';
import { Icon } from './Icon.js';

/** Small icon button used in pane headers and the sidebar toggle. */
export function IconButton({ icon, title, onClick, className = '' }: {
  icon: string;
  title: string;
  onClick: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded-md text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors ${className}`}
    >
      <Icon name={icon} size={14} strokeWidth={2} />
    </button>
  );
}
