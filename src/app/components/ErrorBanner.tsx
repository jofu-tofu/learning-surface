import React from 'react';
import { Icon } from './Icon.js';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }): React.ReactElement {
  return (
    <div className="flex items-start gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      <div className="flex-1">
        <p>{message}</p>
        <p className="mt-1 text-red-400/70 text-xs">Try switching to a different provider.</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400/60 hover:text-red-400 transition-colors"
          aria-label="Dismiss error"
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
