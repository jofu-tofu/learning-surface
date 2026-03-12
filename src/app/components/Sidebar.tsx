import React from 'react';

export interface SidebarProps {
  sections: Array<{ title: string; status: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  return (
    <nav>
      {sections.map((section) => {
        const id = slugify(section.title);
        const isActive = id === activeSection;
        const isCompleted = section.status === 'completed';
        const testId = isActive ? `section-active-${id}` : isCompleted ? `section-completed-${id}` : `section-${id}`;

        return (
          <div
            key={id}
            data-testid={testId}
            onClick={() => onSectionClick?.(id)}
          >
            {section.title}
          </div>
        );
      })}
    </nav>
  );
}
