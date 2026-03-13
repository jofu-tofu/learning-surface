import React, { useState, useRef, useCallback } from 'react';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { focusRing, popoverPanel, menuItemActive, menuItemInactive } from '../utils/styles.js';
import { Icon } from './Icon.js';

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

interface DropdownOption {
  value: string;
  label: string;
}

type DropdownId = 'provider' | 'model' | 'effort';

function DropdownMenu({ options, value, onChange }: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <div className={`${popoverPanel} min-w-36 py-1 z-50`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${focusRing} ${
            opt.value === value ? menuItemActive : menuItemInactive
          }`}
        >
          {opt.label}
        </button>
      ))}
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
  const [openMenu, setOpenMenu] = useState<DropdownId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpenMenu(null), []);
  useClickOutside(containerRef, close);

  const toggle = (id: DropdownId) => setOpenMenu(prev => prev === id ? null : id);

  const activeProvider = providers.find((p) => p.id === selectedProvider);
  const models = activeProvider?.models ?? [];
  const activeModel = models.find((m) => m.id === selectedModel);
  const efforts = activeModel?.reasoningEfforts ?? [];

  const providerLabel = activeProvider?.name ?? 'Provider';
  const modelLabel = activeModel ? (activeModel.displayName ?? activeModel.name) : 'Model';
  const effortLabel = selectedReasoningEffort ?? 'Effort';

  const providerOptions: DropdownOption[] = providers.map(p => ({ value: p.id, label: p.name }));
  const modelOptions: DropdownOption[] = models.map(m => ({ value: m.id, label: m.displayName ?? m.name }));
  const effortOptions: DropdownOption[] = efforts.map(e => ({ value: e, label: e }));

  const triggerBase = 'flex items-center gap-1.5 text-xs h-8 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div ref={containerRef} className="flex items-center h-8 bg-surface-700/40 rounded-full border border-surface-600/30">
      {/* Provider */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle('provider')}
          aria-label="Provider"
          aria-expanded={openMenu === 'provider'}
          className={`${triggerBase} ${focusRing} text-surface-300 font-medium pl-2.5 pr-2.5 hover:text-surface-100 rounded-l-full`}
        >
          {selectedProvider && <ProviderIcon providerId={selectedProvider} />}
          <span>{providerLabel}</span>
          <Icon name="chevronDown" size={8} strokeWidth={3} className="text-surface-500 shrink-0" />
        </button>
        {openMenu === 'provider' && (
          <DropdownMenu
            options={providerOptions}
            value={selectedProvider ?? ''}
            onChange={(v) => { onProviderChange(v); close(); }}
          />
        )}
      </div>

      <div className="w-px h-3.5 bg-surface-600/40" />

      {/* Model */}
      <div className="relative">
        <button
          type="button"
          onClick={() => models.length > 0 && toggle('model')}
          disabled={models.length === 0}
          aria-label="Model"
          aria-expanded={openMenu === 'model'}
          className={`${triggerBase} ${focusRing} text-surface-400 pl-2.5 pr-2.5 hover:text-surface-200 ${efforts.length === 0 ? 'rounded-r-full' : ''}`}
        >
          <span>{modelLabel}</span>
          <Icon name="chevronDown" size={8} strokeWidth={3} className="text-surface-500 shrink-0" />
        </button>
        {openMenu === 'model' && (
          <DropdownMenu
            options={modelOptions}
            value={selectedModel ?? ''}
            onChange={(v) => { onModelChange(v); close(); }}
          />
        )}
      </div>

      {/* Reasoning effort */}
      {efforts.length > 0 && (
        <>
          <div className="w-px h-3.5 bg-surface-600/40" />
          <div className="relative">
            <button
              type="button"
              onClick={() => toggle('effort')}
              aria-label="Reasoning effort"
              aria-expanded={openMenu === 'effort'}
              className={`${triggerBase} ${focusRing} text-surface-400 pl-2.5 pr-2.5 hover:text-surface-200 rounded-r-full`}
            >
              <span>{effortLabel}</span>
              <Icon name="chevronDown" size={8} strokeWidth={3} className="text-surface-500 shrink-0" />
            </button>
            {openMenu === 'effort' && (
              <DropdownMenu
                options={effortOptions}
                value={selectedReasoningEffort ?? ''}
                onChange={(v) => { onReasoningEffortChange(v as ReasoningEffort); close(); }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
