import React, { useState, useEffect } from 'react';

export interface ChatBarProps {
  onSubmit?: (text: string) => void;
  fillPrompt?: string;
}

export function ChatBar({ onSubmit, fillPrompt }: ChatBarProps): React.ReactElement {
  const [value, setValue] = useState(fillPrompt ?? '');

  useEffect(() => {
    if (fillPrompt !== undefined) {
      setValue(fillPrompt);
    }
  }, [fillPrompt]);

  const handleSubmit = () => {
    if (!value) return;
    onSubmit?.(value);
    setValue('');
  };

  return (
    <div>
      <input
        type="text"
        role="textbox"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button disabled={!value} onClick={handleSubmit}>
        Send
      </button>
    </div>
  );
}
