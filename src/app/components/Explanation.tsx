import React, { useMemo } from 'react';
import type { Section } from '../../shared/types.js';
import { getContentSlots } from './content-slots/registry.js';
// Side-effect imports: register built-in content slots before getContentSlots() is called.
// These live here (the consumer) rather than in registry.ts to avoid a circular dependency
// (registry.ts → SlotFile → registerContentSlot → registry Map still in TDZ).
import './content-slots/ExplanationSlot.js';
import './content-slots/DeeperPatternsSlot.js';
import './content-slots/ChecksSlot.js';
import './content-slots/FollowupsSlot.js';
import { EmptyState } from './EmptyState.js';
import { Icon } from './Icon.js';
import { useContentRefresh } from '../hooks/useContentRefresh.js';

interface ExplanationProps {
  section: Section | undefined;
  onFollowupClick?: (question: string) => void;
}

const explanationEmptyIcon = (
  <Icon name="document" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function Explanation({ section, onFollowupClick }: ExplanationProps): React.ReactElement {
  const slots = getContentSlots();
  const activeSlots = section ? slots.filter(slot => slot.hasContent(section)) : [];

  const fingerprint = useMemo(() => {
    if (!section) return '';
    return `${section.explanation ?? ''}|${JSON.stringify(section.deeperPatterns)}|${JSON.stringify(section.checks)}|${JSON.stringify(section.followups)}`;
  }, [section]);
  const refreshRef = useContentRefresh(fingerprint, 150);

  return (
    <div ref={refreshRef} className="explanation-pane space-y-6">
      {section && activeSlots.map((slot, index) => (
        <slot.component key={index} section={section} onFollowupClick={onFollowupClick} />
      ))}

      {activeSlots.length === 0 && (
        <EmptyState icon={explanationEmptyIcon} message="Select a section to see its explanation" />
      )}
    </div>
  );
}
