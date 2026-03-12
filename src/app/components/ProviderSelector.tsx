import React from 'react';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';

function ProviderIcon({ providerId }: { providerId: string }): React.ReactElement | null {
  if (providerId === 'claude-code') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#d97757" stroke="none">
        <path d="M12 2C12 10 14 12 22 12C14 12 12 14 12 22C12 14 10 12 2 12C10 12 12 10 12 2Z" />
      </svg>
    );
  }
  if (providerId === 'codex' || providerId === 'codex-api') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10a37f" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return null;
}

function SelectField({ value, onChange, label, disabled, className, children }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-transparent text-xs h-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 cursor-pointer transition-colors ${className ?? ''}`}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-surface-500" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export interface ProviderSelectorProps {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  onReasoningEffortChange: (effort: ReasoningEffort) => void;
}

export function ProviderSelector({
  providers,
  selectedProvider,
  selectedModel,
  selectedReasoningEffort,
  onProviderChange,
  onModelChange,
  onReasoningEffortChange,
}: ProviderSelectorProps): React.ReactElement {
  const activeProvider = providers.find((p) => p.id === selectedProvider);
  const models = activeProvider?.models ?? [];
  const activeModel = models.find((m) => m.id === selectedModel);
  const efforts = activeModel?.reasoningEfforts ?? [];

  return (
    <div className="flex items-center h-8 bg-surface-700/40 rounded-full border border-surface-600/30">
      {selectedProvider && (
        <div className="pl-2.5 flex items-center">
          <ProviderIcon providerId={selectedProvider} />
        </div>
      )}
      <SelectField
        value={selectedProvider ?? ''}
        onChange={onProviderChange}
        label="Provider"
        className={`text-surface-300 font-medium ${selectedProvider ? 'pl-1.5' : 'pl-3.5'} pr-6 hover:text-surface-100 focus-visible:rounded-l-full`}
      >
        <option value="" disabled>Provider</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </SelectField>
      <div className="w-px h-3.5 bg-surface-600/40" />
      <SelectField
        value={selectedModel ?? ''}
        onChange={onModelChange}
        label="Model"
        disabled={models.length === 0}
        className={`text-surface-400 pl-3 pr-6 hover:text-surface-200 disabled:opacity-40 disabled:cursor-not-allowed ${efforts.length === 0 ? 'focus-visible:rounded-r-full' : ''}`}
      >
        <option value="" disabled>Model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.displayName ?? m.name}</option>
        ))}
      </SelectField>
      {efforts.length > 0 && (
        <>
          <div className="w-px h-3.5 bg-surface-600/40" />
          <SelectField
            value={selectedReasoningEffort ?? ''}
            onChange={(v) => onReasoningEffortChange(v as ReasoningEffort)}
            label="Reasoning effort"
            className="text-surface-400 pl-3 pr-6 hover:text-surface-200 focus-visible:rounded-r-full"
          >
            <option value="" disabled>Effort</option>
            {efforts.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </SelectField>
        </>
      )}
    </div>
  );
}
