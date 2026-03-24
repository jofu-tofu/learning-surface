import { useState, useCallback } from 'react';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';

interface UseProviderSelectionReturn {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
  setSelectedProvider: (id: string) => void;
  setSelectedModel: (id: string) => void;
  setSelectedReasoningEffort: (effort: ReasoningEffort) => void;
  /** Auto-select first provider/model if nothing is selected yet. */
  autoSelect: (providers: ProviderInfo[]) => void;
}

export function useProviderSelection(): UseProviderSelectionReturn {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProviderState] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [selectedReasoningEffort, setSelectedReasoningEffortState] = useState<ReasoningEffort | null>(null);

  const autoSelect = useCallback((providerList: ProviderInfo[]) => {
    setProviders(providerList);
    if (providerList.length > 0) {
      setSelectedProviderState((prev) => {
        if (prev) return prev;
        // Prefer a provider with a 5.4 model; fall back to first available
        const available = providerList.filter(p => p.status?.available !== false);
        const with54 = available.find(p => p.models.some(m => /5\.4/.test(m.id)));
        const firstAvailable = with54 ?? available[0] ?? providerList[0];
        const model54 = firstAvailable.models.find(m => /5\.4/.test(m.id));
        const firstModel = model54 ?? firstAvailable.models[0];
        setSelectedModelState(firstModel?.id ?? null);
        setSelectedReasoningEffortState('low');
        return firstAvailable.id;
      });
    }
  }, []);

  const setSelectedProvider = useCallback((id: string) => {
    setSelectedProviderState(id);
    const matchedProvider = providers.find((provider) => provider.id === id);
    if (matchedProvider && matchedProvider.models.length > 0) {
      const firstModel = matchedProvider.models[0];
      setSelectedModelState(firstModel.id);
      setSelectedReasoningEffortState(firstModel.defaultEffort ?? null);
    } else {
      setSelectedModelState(null);
      setSelectedReasoningEffortState(null);
    }
  }, [providers]);

  const setSelectedModel = useCallback((id: string) => {
    setSelectedModelState(id);
    const matchedProvider = providers.find((provider) => provider.id === selectedProvider);
    const model = matchedProvider?.models.find((model) => model.id === id);
    setSelectedReasoningEffortState(model?.defaultEffort ?? null);
  }, [providers, selectedProvider]);

  const setSelectedReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setSelectedReasoningEffortState(effort);
  }, []);

  return {
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    autoSelect,
  };
}
