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
    <div className="flex items-center gap-3 px-5 py-3 pb-4 bg-surface-800">
      {providers.length > 0 && onProviderChange && onModelChange && (
        <ProviderSelector
          providers={providers}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
        />
      )}
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
          className={`w-full bg-surface-700 text-surface-100 placeholder:text-surface-500 rounded-lg px-4 py-2.5 text-sm border focus:outline-none transition-colors ${isProcessing ? 'border-accent-500/50 text-surface-400' : 'border-surface-600 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50'}`}
        />
        {isProcessing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
      <button
        disabled={!value.trim() || isProcessing}
        onClick={handleSubmit}
        className="shrink-0 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
