import React from 'react';
import type { ProviderInfo } from '../../shared/providers.js';

export interface ProviderSelectorProps {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
}

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
    <div className="flex items-center h-9 bg-surface-700/50 rounded-full border border-surface-600/40">
      <div className="relative">
        <select
          value={selectedProvider ?? ''}
          onChange={(e) => onProviderChange(e.target.value)}
          className="appearance-none bg-transparent text-surface-300 text-xs font-medium pl-3 pr-5 h-9 focus:outline-none cursor-pointer hover:text-surface-100 transition-colors"
          aria-label="Provider"
        >
          <option value="" disabled>Provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-surface-500" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className="w-px h-3.5 bg-surface-600/50" />
      <div className="relative">
        <select
          value={selectedModel ?? ''}
          onChange={(e) => onModelChange(e.target.value)}
          className="appearance-none bg-transparent text-surface-400 text-xs pl-2.5 pr-5 h-9 focus:outline-none cursor-pointer hover:text-surface-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={models.length === 0}
          aria-label="Model"
        >
          <option value="" disabled>Model</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.displayName ?? m.name}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-surface-500" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}
