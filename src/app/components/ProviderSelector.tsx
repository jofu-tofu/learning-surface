import React from 'react';
import type { ProviderInfo } from '../../shared/providers.js';

export interface ProviderSelectorProps {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
}

const selectClass = 'bg-surface-700 text-surface-200 text-xs rounded px-2 py-1.5 border border-surface-600 focus:outline-none focus:border-accent-500 cursor-pointer appearance-none';

export function ProviderSelector({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
}: ProviderSelectorProps): React.ReactElement {
  const activeProvider = providers.find((p) => p.id === selectedProvider);
  const models = activeProvider?.models ?? [];

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedProvider ?? ''}
        onChange={(e) => onProviderChange(e.target.value)}
        className={selectClass}
        aria-label="Provider"
      >
        <option value="" disabled>Provider</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select
        value={selectedModel ?? ''}
        onChange={(e) => onModelChange(e.target.value)}
        className={selectClass}
        disabled={models.length === 0}
        aria-label="Model"
      >
        <option value="" disabled>Model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}
