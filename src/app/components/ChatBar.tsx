import React, { useState } from 'react';
import { ProviderSelector, type ProviderSelectorProps } from './ProviderSelector.js';
import { Icon } from './Icon.js';
import { useIsProcessing } from '../hooks/ProcessingContext.js';

interface ChatBarProps {
  onSubmit?: (text: string) => void;
  providerSelection?: ProviderSelectorProps;
  /** When true, the chat bar is disabled and shows a study mode message. */
  studyModeDisabled?: boolean;
}

export function ChatBar({
  onSubmit,
  providerSelection,
  studyModeDisabled = false,
}: ChatBarProps): React.ReactElement {
  const [inputText, setInputText] = useState('');
  const isProcessing = useIsProcessing();
  const disabled = isProcessing || studyModeDisabled;

  const handleSubmit = () => {
    if (!inputText.trim() || disabled) return;
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
          disabled={disabled}
          placeholder={studyModeDisabled ? "Unavailable in study mode" : isProcessing ? "Processing..." : "Ask a question or explore a concept..."}
          className={`w-full h-8 bg-surface-700/60 text-surface-100 placeholder:text-surface-500 rounded-full pl-4 pr-9 text-sm border focus:outline-none transition-all duration-150 ${disabled ? 'border-accent-500/40 text-surface-400' : 'border-surface-600/30 focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20 focus:bg-surface-700/80'}`}
        />
        {isProcessing ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <button
            disabled={!inputText.trim()}
            onClick={handleSubmit}
            aria-label="Send"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed text-surface-500 hover:text-accent-400 disabled:text-surface-600"
          >
            <Icon name="arrowRight" size={14} />
          </button>
        )}
      </div>
      {providerSelection && <ProviderSelector {...providerSelection} />}
    </div>
  );
}
