import { useCallback, useRef } from 'react';
import type { ClientMessage } from '../../shared/types.js';
import type { ReasoningEffort } from '../../shared/providers.js';
import type { SurfaceState } from './surfaceReducer.js';

type SetState = React.Dispatch<React.SetStateAction<SurfaceState>>;
type SendFn = (data: unknown) => void;

interface ProviderState {
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
}

interface PromptSubmission {
  submitPrompt: (text: string) => void;
  submitPrediction: (sectionId: string, responses: Record<string, string>) => void;
  executePendingPromptEffect: () => void;
  clearPendingPrompt: () => void;
}

export function usePromptSubmission(
  state: SurfaceState,
  setState: SetState,
  send: SendFn,
  isDraftChat: boolean,
  providerState: ProviderState,
): PromptSubmission {
  const { selectedProvider, selectedModel, selectedReasoningEffort } = providerState;
  const pendingPromptRef = useRef<Omit<Extract<ClientMessage, { type: 'prompt' }>, 'type'> & { isDraft?: boolean } | null>(null);

  const submitPrompt = useCallback((text: string) => {
    setState(prevState => ({
      ...prevState,
      isProcessing: true,
      providerError: null,
      studyModeLocked: prevState.studyMode ? true : prevState.studyModeLocked,
    }));

    const predictionMode = state.studyMode ? 'study' as const : 'answer' as const;

    if (!selectedProvider || !selectedModel) {
      send({
        type: isDraftChat ? 'new-chat-with-prompt' : 'prompt',
        text,
        fromVersion: isDraftChat ? undefined : state.currentVersion,
        provider: selectedProvider,
        model: selectedModel,
        reasoningEffort: selectedReasoningEffort ?? undefined,
        predictionMode,
      } as ClientMessage);
      return;
    }

    pendingPromptRef.current = {
      text,
      fromVersion: isDraftChat ? undefined : state.currentVersion,
      provider: selectedProvider,
      model: selectedModel,
      reasoningEffort: selectedReasoningEffort ?? undefined,
      predictionMode,
      isDraft: isDraftChat,
    };

    send({ type: 'preflight', provider: selectedProvider, model: selectedModel });
  }, [setState, send, state.studyMode, state.currentVersion, selectedProvider, selectedModel, selectedReasoningEffort, isDraftChat]);

  const submitPrediction = useCallback((sectionId: string, responses: Record<string, string>) => {
    setState(prevState => ({ ...prevState, isProcessing: true, providerError: null }));
    send({ type: 'submit-prediction', sectionId, responses } as ClientMessage);
  }, [setState, send]);

  const executePendingPromptEffect = useCallback(() => {
    if (pendingPromptRef.current) {
      const { isDraft, ...promptData } = pendingPromptRef.current;
      send({ type: isDraft ? 'new-chat-with-prompt' : 'prompt', ...promptData });
      pendingPromptRef.current = null;
    }
  }, [send]);

  const clearPendingPrompt = useCallback(() => {
    pendingPromptRef.current = null;
  }, []);

  return { submitPrompt, submitPrediction, executePendingPromptEffect, clearPendingPrompt };
}
