import React from 'react';
import { useActivity } from '../hooks/SurfaceStatusContext.js';

interface ProcessingStateProps {
  message: string;
}

export function ProcessingState({ message }: ProcessingStateProps): React.ReactElement {
  const activity = useActivity();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 animate-[fade-in_0.3s_ease-out]">
      {/* Animated orbiting dots */}
      <div className="processing-orbit">
        <span className="processing-dot" />
        <span className="processing-dot" />
        <span className="processing-dot" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm text-surface-400">{activity?.label ?? message}</p>
        {activity && (
          <p className="text-xs text-surface-500">
            Step {activity.step || 1}
          </p>
        )}
      </div>
    </div>
  );
}
