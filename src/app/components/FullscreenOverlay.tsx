import React from 'react';
import { IconButton } from './IconButton.js';
import { Icon } from './Icon.js';

interface FullscreenOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenOverlay({ title, onClose, children }: FullscreenOverlayProps): React.ReactElement {
  return (
    <div className="canvas-fullscreen">
      <div className="canvas-fullscreen-header">
        <h2 className="text-sm font-semibold text-surface-50">{title}</h2>
        <div className="flex items-center gap-2">
          <IconButton
            icon="minimize"
            title="Exit fullscreen (Esc)"
            onClick={onClose}
          />
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-600/60 transition-colors"
          >
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
