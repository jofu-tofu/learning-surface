import React, { useState } from 'react';
import { ProviderSelector, type ProviderSelectorProps } from './ProviderSelector.js';
import { Icon } from './Icon.js';
import { useIsProcessing } from '../hooks/SurfaceStatusContext.js';

interface ChatBarProps {
  onSubmit?: (text: string) => void;
  providerSelection?: ProviderSelectorProps;
}

export function ChatBar({
  onSubmit,
  providerSelection,
}: ChatBarProps): React.ReactElement {
  const [inputText, setInputText] = useState('');
  const isProcessing = useIsProcessing();

  const handleSubmit = () => {
    if (!inputText.trim() || isProcessing) return;
    onSubmit?.(inputText.trim());
    setInputText('');
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
          type="text"
          role="textbox"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
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
      {providerSelection && <ProviderSelector {...providerSelection} />}
      <button
        disabled={!inputText.trim() || isProcessing}
        onClick={handleSubmit}
        aria-label="Send"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed bg-surface-700/40 text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 disabled:text-surface-600 disabled:hover:bg-transparent"
      >
        <Icon name="arrowRight" size={16} />
      </button>
    </div>
  );
}
