import React, { useState, useEffect, useRef } from 'react';

export interface ChatBarProps {
  onSubmit?: (text: string) => void;
  fillPrompt?: string;
}

export function ChatBar({ onSubmit, fillPrompt }: ChatBarProps): React.ReactElement {
  const [value, setValue] = useState(fillPrompt ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fillPrompt !== undefined) {
      setValue(fillPrompt);
    }
  }, [fillPrompt]);

  const handleSubmit = () => {
    if (!value.trim()) return;
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
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          role="textbox"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or explore a concept..."
          className="w-full bg-surface-700 text-surface-100 placeholder:text-surface-500 rounded-lg px-4 py-2.5 text-sm border border-surface-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-colors"
        />
      </div>
      <button
        disabled={!value.trim()}
        onClick={handleSubmit}
        className="shrink-0 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
