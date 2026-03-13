import React from 'react';
import { slugify } from '../../shared/slugify.js';
import { listContainer, listItemBase, listItemActive, listItemInactive } from '../utils/styles.js';

interface SidebarProps {
  sections: Array<{ title: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  return (
    <nav className={listContainer}>
      {sections.map((section) => {
        const sectionId = slugify(section.title);
        const isActive = sectionId === activeSection;

        return (
          <button
            key={sectionId}
            data-testid={isActive ? `section-active-${sectionId}` : `section-${sectionId}`}
            onClick={() => onSectionClick?.(sectionId)}
            className={`${listItemBase} ${isActive ? listItemActive : listItemInactive}`}
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
