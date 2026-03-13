import React from 'react';
import { slugify } from '../../shared/slugify.js';
import { listContainer, listItemBase, listItemActive, listItemInactive } from '../utils/styles.js';
import { useChangedSectionIds } from '../hooks/VersionDiffContext.js';

interface SidebarProps {
  sections: Array<{ title: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  const changedSectionIds = useChangedSectionIds();

  return (
    <nav className={listContainer}>
      {sections.map((section) => {
        const sectionId = slugify(section.title);
        const isActive = sectionId === activeSection;
        const isChanged = changedSectionIds.has(sectionId);

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
            {isChanged && (
              <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wider text-accent-400/80 animate-[fade-in_0.3s_ease-out]">
                Updated
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
