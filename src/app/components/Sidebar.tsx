import React from 'react';
import { slugify } from '../../shared/slugify.js';

export interface SidebarProps {
  sections: Array<{ title: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section) => {
        const id = slugify(section.title);
        const isActive = id === activeSection;

        return (
          <button
            key={id}
            data-testid={isActive ? `section-active-${id}` : `section-${id}`}
            onClick={() => onSectionClick?.(id)}
            className={`
              flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer
              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400
              ${isActive
                ? 'bg-accent-600/15 text-accent-400 font-medium shadow-sm shadow-accent-500/5'
                : 'text-surface-300 hover:bg-surface-700/40 hover:text-surface-100'
              }
            `}
          >
            {/* Status indicator */}
            <span className={`
              shrink-0 w-2 h-2 rounded-full
              ${isActive ? 'bg-accent-400' : 'bg-surface-600'}
            `} />
            <span className="truncate">{section.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
