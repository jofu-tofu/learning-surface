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
import { ProcessingState } from './ProcessingState.js';
import { Icon } from './Icon.js';
import { useContentRefresh } from '../hooks/useContentRefresh.js';
import { useIsProcessing } from '../hooks/ProcessingContext.js';
import { useSurfaceActions } from './panes/SurfaceActionsContext.js';
import type { SecondPaneProps } from './panes/registry.js';

const explanationEmptyIcon = (
  <Icon name="document" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function Explanation({ section }: SecondPaneProps): React.ReactElement {
  const { submitPrompt } = useSurfaceActions();
  const slots = getContentSlots();
  const activeSlots = section ? slots.filter(slot => slot.hasContent(section)) : [];
  const isProcessing = useIsProcessing();

  const fingerprint = useMemo(() => {
    if (!section) return '';
    return `${section.explanation ?? ''}|${JSON.stringify(section.deeperPatterns)}|${JSON.stringify(section.checks)}|${JSON.stringify(section.followups)}`;
  }, [section]);
  const refreshRef = useContentRefresh(fingerprint, 150);

  return (
    <div ref={refreshRef} className="explanation-pane space-y-6">
      {section && activeSlots.map((slot) => (
        <slot.component key={slot.id} section={section} {...(slot.id === 'followups' ? { onFollowupClick: submitPrompt } : {})} />
      ))}

      {activeSlots.length === 0 && (
        isProcessing
          ? <ProcessingState message="Generating explanation..." />
          : <EmptyState icon={explanationEmptyIcon} message="Select a section to see its explanation" />
      )}
    </div>
  );
}
