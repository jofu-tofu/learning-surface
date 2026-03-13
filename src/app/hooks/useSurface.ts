import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat, ClientMessage } from '../../shared/types.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { getVersionPath, getForwardPath } from '../../shared/version-tree.js';
import { useWebSocket } from './useWebSocket.js';
import { useProviderSelection } from './useProviderSelection.js';
import { reduceSurfaceMessage, INITIAL_SURFACE_STATE, type SurfaceState } from './surfaceReducer.js';

export interface ToolActivity {
  /** Human-readable label (e.g. "Building diagram") */
  label: string;
  /** Raw tool or phase name (e.g. "show_visual", "thinking") */
  toolName: string;
  /** 1-based step counter (0 for the initial "thinking" phase) */
  step: number;
}

interface UseSurfaceReturn {
  document: LearningDocument | null;
  versions: VersionMeta[];
  currentVersion: number;
  /** Path from root to current version */
  path: VersionMeta[];
  /** Forward continuation (faded crumbs after scrubbing back) */
  forwardPath: VersionMeta[];
  connected: boolean;
  /** Chat management */
  chats: Chat[];
  activeChatId: string | null;
  submitPrompt: (text: string) => void;
  selectVersion: (version: number) => void;
  selectSection: (sectionId: string) => void;
  newChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  /** True from prompt submission until updates settle */
  isProcessing: boolean;
  /** Which panes changed in the most recent document-update */
  changedPanes: Set<string>;
  /** Panes that changed in the current version vs the previous version (persists until next version transition) */
  versionChangedPanes: Set<string>;
  /** Section IDs that were added or modified in the current version (persists until next version transition) */
  changedSectionIds: Set<string>;
  /** Current tool-call activity during processing, null when idle */
  activity: ToolActivity | null;
  /** Provider/model selection */
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
  setSelectedProvider: (id: string) => void;
  setSelectedModel: (id: string) => void;
  setSelectedReasoningEffort: (effort: ReasoningEffort) => void;
  /** Error from provider preflight or runtime failure */
  providerError: string | null;
  clearProviderError: () => void;
}

const WS_URL = 'ws://localhost:8080';

export function useSurface(): UseSurfaceReturn {
  const [state, setState] = useState<SurfaceState>(INITIAL_SURFACE_STATE);
  const { document, versions, currentVersion, chats, activeChatId,
          isProcessing, changedPanes, versionChangedPanes, changedSectionIds,
          activity, providerError } = state;
  const {
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setProviders, setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    autoSelect: autoSelectProvider,
  } = useProviderSelection();
  const prevDocRef = useRef<LearningDocument | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingPromptRef = useRef<Omit<Extract<ClientMessage, { type: 'prompt' }>, 'type'> | null>(null);
  const sendRef = useRef<(data: unknown) => void>(() => {});

  const onMessage = useCallback((msg: WsMessage) => {
    setState(prevState => {
      const reducerResult = reduceSurfaceMessage(
        prevState,
        msg,
        prevDocRef.current,
      );

      prevDocRef.current = reducerResult.prevDoc;

      // Execute side effects (scheduled outside React's state update via queueMicrotask)
      if (reducerResult.effects.length > 0) {
        queueMicrotask(() => {
          for (const effect of reducerResult.effects) {
            switch (effect.type) {
              case 'auto-select-providers':
                autoSelectProvider(effect.providers);
                break;
              case 'set-providers':
                setProviders(effect.providers);
                break;
              case 'reset-settle-timer':
                clearTimeout(settleTimerRef.current);
                settleTimerRef.current = setTimeout(() => {
                  setState(prevState => ({ ...prevState, isProcessing: false, activity: null }));
                }, 2500);
                break;
              case 'schedule-flash-clear':
                clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setState(prevState => ({ ...prevState, changedPanes: new Set() })), 1200);
                break;
              case 'clear-settle-timer':
                clearTimeout(settleTimerRef.current);
                break;
              case 'send-pending-prompt':
                if (pendingPromptRef.current) {
                  sendRef.current({ type: 'prompt', ...pendingPromptRef.current });
                  pendingPromptRef.current = null;
                }
                break;
              case 'clear-pending-prompt':
                pendingPromptRef.current = null;
                break;
            }
          }
        });
      }

      // Log provider errors
      if (msg.type === 'provider-error') {
        console.error('[provider-error]', msg.error);
      }

      return reducerResult.state;
    });
  }, [autoSelectProvider, setProviders]);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });
  useEffect(() => { sendRef.current = send; }, [send]);

  const path = useMemo(() => getVersionPath(currentVersion, versions), [currentVersion, versions]);
  const forwardPath = useMemo(() => getForwardPath(currentVersion, versions), [currentVersion, versions]);

  const submitPrompt = useCallback((text: string) => {
    setState(prevState => ({ ...prevState, isProcessing: true, providerError: null }));

    if (!selectedProvider || !selectedModel) {
      send({
        type: 'prompt',
        text,
        fromVersion: currentVersion,
        provider: selectedProvider,
        model: selectedModel,
        reasoningEffort: selectedReasoningEffort ?? undefined,
      });
      return;
    }

    // Store prompt for after preflight succeeds
    pendingPromptRef.current = {
      text,
      fromVersion: currentVersion,
      provider: selectedProvider,
      model: selectedModel,
      reasoningEffort: selectedReasoningEffort ?? undefined,
    };

    // Run preflight check before sending the prompt
    send({ type: 'preflight', provider: selectedProvider, model: selectedModel });
  }, [send, currentVersion, selectedProvider, selectedModel, selectedReasoningEffort]);

  const selectVersion = useCallback((version: number) => {
    setState(prevState => ({ ...prevState, currentVersion: version }));
    send({ type: 'select-version', version });
  }, [send]);

  const selectSection = useCallback((sectionId: string) => {
    setState(prevState => ({
      ...prevState,
      document: prevState.document ? { ...prevState.document, activeSection: sectionId } : prevState.document,
    }));
    send({ type: 'select-section', sectionId });
  }, [send]);

  const newChat = useCallback(() => {
    send({ type: 'new-chat' });
  }, [send]);

  const switchChat = useCallback((chatId: string) => {
    send({ type: 'switch-chat', chatId });
  }, [send]);

  const deleteChat = useCallback((chatId: string) => {
    send({ type: 'delete-chat', chatId });
  }, [send]);

  const clearProviderError = useCallback(() => setState(prevState => ({ ...prevState, providerError: null })), []);

  return {
    document, versions, currentVersion, path, forwardPath,
    connected, chats, activeChatId,
    submitPrompt, selectVersion, selectSection,
    newChat, switchChat, deleteChat,
    isProcessing, changedPanes, versionChangedPanes, changedSectionIds, activity,
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    providerError, clearProviderError,
  };
}
