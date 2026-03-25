import React, { useState, useCallback } from 'react';
import { registerBlockRenderer } from './registry.js';
import type { BlockRendererProps } from './registry.js';
import type { InteractiveBlock } from '../../../shared/document.js';

function InteractiveBlockRenderer({ block, onResponseChange }: BlockRendererProps): React.ReactElement {
  const interactiveBlock = block as InteractiveBlock;
  const isReadOnly = interactiveBlock.response != null;
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onResponseChange?.(block.id, newValue);
  }, [block.id, onResponseChange]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-surface-200">{interactiveBlock.prompt}</p>
      {isReadOnly ? (
        <p className="text-sm text-accent-400 italic">{interactiveBlock.response}</p>
      ) : (
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="Explain your reasoning..."
          rows={3}
          className="w-full bg-surface-700/60 text-surface-100 placeholder:text-surface-500 rounded-lg px-3 py-2 text-sm border border-surface-600/30 focus:outline-none focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20 resize-none"
        />
      )}
    </div>
  );
}

registerBlockRenderer('interactive', InteractiveBlockRenderer);

export { InteractiveBlockRenderer };
