import React from 'react';
import { useIsProcessing } from '../../hooks/SurfaceStatusContext.js';
import { focusRing } from '../../utils/styles.js';
import { registerContentSlot, SlotHeading, type ContentSlotProps } from './registry.js';

function FollowupsSlot({ section, onFollowupClick }: ContentSlotProps): React.ReactElement {
  const isProcessing = useIsProcessing();
  const followups = section.followups ?? [];

  return (
    <div className="space-y-3">
      <SlotHeading icon="send">Explore Further</SlotHeading>
      <div className="flex flex-wrap gap-2">
        {followups.map((followupQuestion) => (
          <button
            key={followupQuestion}
            onClick={() => onFollowupClick?.(followupQuestion)}
            disabled={isProcessing}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl bg-accent-600/10 text-accent-400 border border-accent-500/20 hover:bg-accent-600/20 hover:border-accent-500/40 hover:shadow-sm hover:shadow-accent-500/5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-600/10 disabled:hover:border-accent-500/20 ${focusRing}`}
          >
            {followupQuestion}
          </button>
        ))}
      </div>
    </div>
  );
}

registerContentSlot('followups', {
  component: FollowupsSlot,
  order: 30,
  hasContent: (section) => (section.followups ?? []).length > 0,
});
