import React, { useState, useEffect, useRef } from 'react';
import { ProviderSelector } from './ProviderSelector.js';
import type { ProviderInfo } from '../../shared/providers.js';

export interface ChatBarProps {
  onSubmit?: (text: string) => void;
  fillPrompt?: string;
  isProcessing?: boolean;
  providers?: ProviderInfo[];
  selectedProvider?: string | null;
  selectedModel?: string | null;
  onProviderChange?: (providerId: string) => void;
  onModelChange?: (modelId: string) => void;
}

export function ChatBar({
  onSubmit,
  fillPrompt,
  isProcessing,
  providers = [],
  selectedProvider = null,
  selectedModel = null,
  onProviderChange,
  onModelChange,
}: ChatBarProps): React.ReactElement {
  const [value, setValue] = useState(fillPrompt ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fillPrompt !== undefined) {
      setValue(fillPrompt);
    }
  }, [fillPrompt]);

  const handleSubmit = () => {
    if (!value.trim() || isProcessing) return;
    onSubmit?.(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 px-5 py-3 pb-4 bg-surface-800">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          role="textbox"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder={isProcessing ? "Processing..." : "Ask a question or explore a concept..."}
          className={`w-full h-9 bg-surface-700 text-surface-100 placeholder:text-surface-500 rounded-full px-4 text-sm border focus:outline-none transition-colors ${isProcessing ? 'border-accent-500/50 text-surface-400' : 'border-surface-600/40 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50'}`}
        />
        {isProcessing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
      {providers.length > 0 && onProviderChange && onModelChange && (
        <ProviderSelector
          providers={providers}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
        />
      )}
      <button
        disabled={!value.trim() || isProcessing}
        onClick={handleSubmit}
        aria-label="Send"
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-surface-400 hover:text-accent-400 hover:bg-surface-700/50 disabled:text-surface-600 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
