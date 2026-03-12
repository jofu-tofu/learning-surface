import React, { useState, useEffect, useRef } from 'react';
import { ProviderSelector } from './ProviderSelector.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';

export interface ChatBarProps {
  onSubmit?: (text: string) => void;
  fillPrompt?: string;
  isProcessing?: boolean;
  providers?: ProviderInfo[];
  selectedProvider?: string | null;
  selectedModel?: string | null;
  selectedReasoningEffort?: ReasoningEffort | null;
  onProviderChange?: (providerId: string) => void;
  onModelChange?: (modelId: string) => void;
  onReasoningEffortChange?: (effort: ReasoningEffort) => void;
}

export function ChatBar({
  onSubmit,
  fillPrompt,
  isProcessing,
  providers = [],
  selectedProvider = null,
  selectedModel = null,
  selectedReasoningEffort = null,
  onProviderChange,
  onModelChange,
  onReasoningEffortChange,
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
    <div className="flex items-center gap-2.5 px-5 py-2 pb-3 bg-surface-800/80">
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
          className={`w-full h-8 bg-surface-700/60 text-surface-100 placeholder:text-surface-500 rounded-full px-4 text-sm border focus:outline-none transition-all duration-150 ${isProcessing ? 'border-accent-500/40 text-surface-400' : 'border-surface-600/30 focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20 focus:bg-surface-700/80'}`}
        />
        {isProcessing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
      {providers.length > 0 && onProviderChange && onModelChange && onReasoningEffortChange && (
        <ProviderSelector
          providers={providers}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          selectedReasoningEffort={selectedReasoningEffort}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          onReasoningEffortChange={onReasoningEffortChange}
        />
      )}
      <button
        disabled={!value.trim() || isProcessing}
        onClick={handleSubmit}
        aria-label="Send"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed bg-surface-700/40 text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 disabled:text-surface-600 disabled:hover:bg-transparent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
