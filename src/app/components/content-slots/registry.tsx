import type React from 'react';
import type { Section } from '../../../shared/types.js';
import { Icon } from '../Icon.js';
import { sectionHeading } from '../../utils/styles.js';

export interface ContentSlotProps {
  section: Section;
  onFollowupClick?: (question: string) => void;
}

/** Shared heading for content slots — Icon + title in the standard section style. */
export function SlotHeading({ icon, children }: { icon: string; children: React.ReactNode }): React.ReactElement {
  return (
    <h3 className={`${sectionHeading} flex items-center gap-2`}>
      <Icon name={icon} className="w-3.5 h-3.5" size={14} />
      {children}
    </h3>
  );
}

interface ContentSlotEntry {
  component: React.ComponentType<ContentSlotProps>;
  order: number;
  hasContent: (section: Section) => boolean;
}

const registry = new Map<string, ContentSlotEntry>();

export function registerContentSlot(name: string, entry: ContentSlotEntry): void {
  registry.set(name, entry);
}

/** Return all registered slots sorted by order. */
export function getContentSlots(): ContentSlotEntry[] {
  return [...registry.values()].sort((slotA, slotB) => slotA.order - slotB.order);
}
