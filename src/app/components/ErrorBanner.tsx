import React from 'react';
import { Icon } from './Icon.js';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }): React.ReactElement {
  return (
    <div className="flex items-start gap-3 text-sm text-danger-text bg-danger-bg border border-danger-border rounded-lg p-3">
      <div className="flex-1">
        <p>{message}</p>
        <p className="mt-1 text-danger-muted text-xs">Try switching to a different provider.</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-danger-muted hover:text-danger-text transition-colors"
          aria-label="Dismiss error"
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
