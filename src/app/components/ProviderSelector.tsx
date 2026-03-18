import React, { useState, useRef } from 'react';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { focusRing, popoverPanel, menuItemActive, menuItemInactive } from '../utils/styles.js';
import { Icon } from './Icon.js';

function ProviderIcon({ providerId, size = 14 }: { providerId: string; size?: number }): React.ReactElement | null {
  if (providerId === 'claude-code') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#d97757" stroke="none">
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
      </svg>
    );
  }
  if (providerId === 'codex' || providerId === 'codex-api') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#10a37f" stroke="none">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0154-1.164a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    );
  }
  return null;
}

interface DropdownOption {
  value: string;
  label: string;
  providerId?: string;
  badge?: string;
  available?: boolean;
  statusError?: string;
}

type DropdownId = 'provider' | 'model' | 'effort';

function DropdownMenu({ options, value, onChange }: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <div className={`${popoverPanel} min-w-36 py-1 z-50`}>
      {options.map(option => {
        const isUnavailable = option.available === false;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !isUnavailable && onChange(option.value)}
            title={isUnavailable ? option.statusError : undefined}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${focusRing} ${
              isUnavailable
                ? 'opacity-40 cursor-not-allowed'
                : `cursor-pointer ${option.value === value ? menuItemActive : menuItemInactive}`
            }`}
          >
            {option.providerId && <ProviderIcon providerId={option.providerId} size={12} />}
            {option.available !== undefined && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                option.available ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
            )}
            <span className="flex-1">{option.label}</span>
            {option.badge && (
              <span className="text-[9px] uppercase tracking-wider text-surface-500 font-medium">{option.badge}</span>
            )}
          </button>
        );
      })}
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

  useClickOutside(containerRef, () => setOpenMenu(null));

  const toggleMenu = (id: DropdownId) => setOpenMenu(prev => prev === id ? null : id);

  const activeProvider = providers.find((provider) => provider.id === selectedProvider);
  const models = activeProvider?.models ?? [];
  const activeModel = models.find((model) => model.id === selectedModel);
  const efforts = activeModel?.reasoningEfforts ?? [];

  const providerLabel = activeProvider?.name ?? 'Provider';
  const modelLabel = activeModel ? (activeModel.displayName ?? activeModel.name) : 'Model';
  const effortLabel = selectedReasoningEffort ?? 'Effort';

  const providerOptions: DropdownOption[] = providers.map(provider => ({
    value: provider.id,
    label: provider.name,
    providerId: provider.id,
    badge: provider.type ?? undefined,
    available: provider.status?.available,
    statusError: provider.status?.error,
  }));
  const modelOptions: DropdownOption[] = models.map(model => ({ value: model.id, label: model.displayName ?? model.name }));
  const effortOptions: DropdownOption[] = efforts.map(effort => ({ value: effort, label: effort }));

  const activeProviderStatus = activeProvider?.status;

  const triggerBase = 'flex items-center gap-1.5 text-xs h-8 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div ref={containerRef} className="flex items-center h-8 bg-surface-700/40 rounded-full border border-surface-600/30">
      {/* Provider */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggleMenu('provider')}
          aria-label="Provider"
          aria-expanded={openMenu === 'provider'}
          title={activeProviderStatus?.available === false ? activeProviderStatus.error : undefined}
          className={`${triggerBase} ${focusRing} text-surface-300 font-medium pl-2.5 pr-2.5 hover:text-surface-100 rounded-l-full`}
        >
          {selectedProvider && <ProviderIcon providerId={selectedProvider} />}
          {activeProviderStatus !== undefined && (
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
              activeProviderStatus.available ? 'bg-emerald-400' : 'bg-red-400'
            }`} />
          )}
          <span>{providerLabel}</span>
          <Icon name="chevronDown" size={8} strokeWidth={3} className="text-surface-500 shrink-0" />
        </button>
        {openMenu === 'provider' && (
          <DropdownMenu
            options={providerOptions}
            value={selectedProvider ?? ''}
            onChange={(selectedValue) => { onProviderChange(selectedValue); setOpenMenu(null); }}
          />
        )}
      </div>

      <div className="w-px h-3.5 bg-surface-600/40" />

      {/* Model */}
      <div className="relative">
        <button
          type="button"
          onClick={() => models.length > 0 && toggleMenu('model')}
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
            onChange={(selectedValue) => { onModelChange(selectedValue); setOpenMenu(null); }}
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
              onClick={() => toggleMenu('effort')}
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
                onChange={(selectedValue) => { onReasoningEffortChange(selectedValue as ReasoningEffort); setOpenMenu(null); }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
