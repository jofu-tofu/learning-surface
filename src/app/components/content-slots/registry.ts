import type React from 'react';
import type { Section } from '../../../shared/types.js';

export interface ContentSlotProps {
  section: Section;
  onFollowupClick?: (question: string) => void;
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
