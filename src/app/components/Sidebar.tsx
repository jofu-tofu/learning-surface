import React from 'react';
import { slugify } from '../../shared/slugify.js';

export interface SidebarProps {
  sections: Array<{ title: string; status: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {sections.map((section) => {
        const id = slugify(section.title);
        const isActive = id === activeSection;
        const isCompleted = section.status === 'completed';
        const testId = isActive ? `section-active-${id}` : isCompleted ? `section-completed-${id}` : `section-${id}`;

        return (
          <button
            key={id}
            data-testid={testId}
            onClick={() => onSectionClick?.(id)}
            className={`
              flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
              ${isActive
                ? 'bg-accent-600/20 text-accent-400 font-medium'
                : 'text-surface-300 hover:bg-surface-700/50 hover:text-surface-100'
              }
            `}
          >
            {/* Status indicator */}
            <span className={`
              shrink-0 w-2 h-2 rounded-full
              ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-accent-400' : 'bg-surface-600'}
            `} />
            <span className="truncate">{section.title}</span>
            {isCompleted && (
              <svg className="shrink-0 ml-auto w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </nav>
  );
}
