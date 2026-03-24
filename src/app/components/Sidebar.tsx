import React, { useEffect, useRef } from 'react';
import { listContainer, listItemBase, listItemActive, listItemInactive, updatedBadge } from '../utils/styles.js';
import { useChangedSectionIds, useFlashSectionIds } from '../hooks/ChangeDetectionContext.js';

interface SidebarProps {
  sections: Array<{ id: string; title: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

/** Plays a staggered background-glow animation when a section starts flashing. */
function useSectionFlash(
  ref: React.RefObject<HTMLButtonElement | null>,
  isFlashing: boolean,
  isActive: boolean,
  staggerIndex: number,
): void {
  const wasFlashing = useRef(false);

  useEffect(() => {
    if (isFlashing && !wasFlashing.current && !isActive && ref.current) {
      ref.current.getAnimations().forEach(a => a.cancel());
      ref.current.animate(
        [
          { backgroundColor: 'oklch(0.55 0.15 250 / 0.12)' },
          { backgroundColor: 'transparent' },
        ],
        {
          duration: 800,
          easing: 'ease-out',
          delay: staggerIndex * 60,
        },
      );
    }
    wasFlashing.current = isFlashing;
  }, [isFlashing, isActive, staggerIndex, ref]);
}

export function Sidebar({ sections, activeSection, onSectionClick }: SidebarProps): React.ReactElement {
  const changedSectionIds = useChangedSectionIds();
  const flashSectionIds = useFlashSectionIds();

  return (
    <nav className={listContainer}>
      {sections.map((section, index) => {
        const sectionId = section.id;
        const isActive = sectionId === activeSection;
        const isChanged = changedSectionIds.has(sectionId);
        const isFlashing = flashSectionIds.has(sectionId);

        return (
          <SidebarItem
            key={sectionId}
            sectionId={sectionId}
            title={section.title}
            isActive={isActive}
            isChanged={isChanged}
            isFlashing={isFlashing}
            staggerIndex={index}
            onClick={() => onSectionClick?.(sectionId)}
          />
        );
      })}
    </nav>
  );
}

interface SidebarItemProps {
  sectionId: string;
  title: string;
  isActive: boolean;
  isChanged: boolean;
  isFlashing: boolean;
  staggerIndex: number;
  onClick: () => void;
}

function SidebarItem({ sectionId, title, isActive, isChanged, isFlashing, staggerIndex, onClick }: SidebarItemProps): React.ReactElement {
  const ref = useRef<HTMLButtonElement>(null);
  useSectionFlash(ref, isFlashing, isActive, staggerIndex);

  return (
    <button
      ref={ref}
      data-testid={isActive ? `section-active-${sectionId}` : `section-${sectionId}`}
      onClick={onClick}
      className={`${listItemBase} ${isActive ? listItemActive : listItemInactive}`}
    >
      {/* Status indicator */}
      <span className={`
        shrink-0 w-2 h-2 rounded-full transition-colors duration-300
        ${isActive ? 'bg-accent-400' : isFlashing ? 'bg-accent-400/60' : 'bg-surface-600'}
      `} />
      <span className="truncate">{title}</span>
      {isChanged && (
        <span className={`ml-auto shrink-0 text-accent-400/80 ${updatedBadge}`}>
          Updated
        </span>
      )}
    </button>
  );
}
