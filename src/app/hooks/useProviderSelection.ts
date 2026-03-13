import { useState, useCallback } from 'react';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';

interface UseProviderSelectionReturn {
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
  setProviders: (providers: ProviderInfo[]) => void;
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
        const p = providerList[0];
        const firstModel = p.models[0];
        setSelectedModelState((prevM) => prevM ?? firstModel?.id ?? null);
        setSelectedReasoningEffortState((prevE) => prevE ?? firstModel?.defaultEffort ?? null);
        return p.id;
      });
    }
  }, []);

  const setSelectedProvider = useCallback((id: string) => {
    setSelectedProviderState(id);
    const p = providers.find((p) => p.id === id);
    if (p && p.models.length > 0) {
      const firstModel = p.models[0];
      setSelectedModelState(firstModel.id);
      setSelectedReasoningEffortState(firstModel.defaultEffort ?? null);
    } else {
      setSelectedModelState(null);
      setSelectedReasoningEffortState(null);
    }
  }, [providers]);

  const setSelectedModel = useCallback((id: string) => {
    setSelectedModelState(id);
    const p = providers.find((p) => p.id === selectedProvider);
    const model = p?.models.find((m) => m.id === id);
    setSelectedReasoningEffortState(model?.defaultEffort ?? null);
  }, [providers, selectedProvider]);

  const setSelectedReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setSelectedReasoningEffortState(effort);
  }, []);

  return {
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setProviders, setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    autoSelect,
  };
}
