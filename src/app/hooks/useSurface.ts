import { useState, useCallback, useEffect, useRef } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat } from '../../shared/types.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { useWebSocket } from './useWebSocket.js';
import { useProviderSelection } from './useProviderSelection.js';
import { reduceSurfaceMessage, INITIAL_SURFACE_STATE, type SurfaceState, type ToolActivity } from './surfaceReducer.js';
import { useDocumentActions } from './useDocumentActions.js';
import { useChatActions } from './useChatActions.js';
import { useProcessingState } from './useProcessingState.js';
import { useChangeDetection } from './useChangeDetection.js';
import { useStudyMode } from './useStudyMode.js';
import { usePromptSubmission } from './usePromptSubmission.js';

export type { ToolActivity } from './surfaceReducer.js';

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
  /** True when the current view is a blank draft (no chat created yet). */
  isDraftChat: boolean;
  submitPrompt: (text: string) => void;
  selectVersion: (version: number) => void;
  selectSection: (sectionId: string) => void;
  newChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  deleteChats: (chatIds: string[]) => void;
  renameChat: (chatId: string, title: string) => void;
  /** True from prompt submission until updates settle */
  isProcessing: boolean;
  /** Which panes changed in the most recent document-update */
  changedPanes: Set<string>;
  /** Panes that changed in the current version vs the previous version (persists until next version transition) */
  versionChangedPanes: Set<string>;
  /** Section IDs that were added or modified in the current version (persists until next version transition) */
  changedSectionIds: Set<string>;
  /** Section IDs that changed in the most recent streaming update (1.2s flash lifetime) */
  flashSectionIds: Set<string>;
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
  /** Study mode state */
  studyMode: boolean;
  studyModeLocked: boolean;
  setStudyMode: (enabled: boolean) => void;
  submitPrediction: (sectionId: string, responses: Record<string, string>) => void;
}

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : 'ws://localhost:8080';

export function useSurface(): UseSurfaceReturn {
  const [state, setState] = useState<SurfaceState>(INITIAL_SURFACE_STATE);
  const {
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    autoSelect: autoSelectProvider,
  } = useProviderSelection();
  const prevDocRef = useRef<LearningDocument | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sendRef = useRef<(data: unknown) => void>(() => {});

  // --- Domain hooks (facades over shared SurfaceState) ---

  const { document, versions, currentVersion, path, forwardPath, selectVersion, selectSection } =
    useDocumentActions(state, setState, sendRef.current);

  const { chats, activeChatId, isDraftChat, newChat, switchChat, deleteChat, deleteChats, renameChat } =
    useChatActions(state, setState, sendRef.current);

  const { isProcessing, activity } = useProcessingState(state);
  const { changedPanes, versionChangedPanes, changedSectionIds, flashSectionIds } = useChangeDetection(state);
  const { studyMode, studyModeLocked, setStudyMode } = useStudyMode(state, setState);

  const { submitPrompt, submitPrediction, executePendingPromptEffect, clearPendingPrompt } =
    usePromptSubmission(state, setState, sendRef.current, isDraftChat, {
      selectedProvider, selectedModel, selectedReasoningEffort,
    });

  // Keep refs to pending-prompt callbacks so onMessage stays stable (no WS reconnects).
  const pendingPromptRef = useRef(executePendingPromptEffect);
  const clearPendingRef = useRef(clearPendingPrompt);
  useEffect(() => { pendingPromptRef.current = executePendingPromptEffect; }, [executePendingPromptEffect]);
  useEffect(() => { clearPendingRef.current = clearPendingPrompt; }, [clearPendingPrompt]);

  // --- Effect executor (cross-cutting: timers + pending prompt) ---

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
              case 'reset-settle-timer':
                clearTimeout(settleTimerRef.current);
                settleTimerRef.current = setTimeout(() => {
                  setState(prevState => ({ ...prevState, isProcessing: false, activity: null }));
                }, 2500);
                break;
              case 'schedule-flash-clear':
                clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setState(prevState => ({ ...prevState, changedPanes: new Set(), flashSectionIds: new Set() })), 1200);
                break;
              case 'clear-settle-timer':
                clearTimeout(settleTimerRef.current);
                break;
              case 'send-pending-prompt':
                pendingPromptRef.current();
                break;
              case 'clear-pending-prompt':
                clearPendingRef.current();
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
  }, [autoSelectProvider]);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });
  useEffect(() => { sendRef.current = send; }, [send]);

  const clearProviderError = useCallback(() => setState(prevState => ({ ...prevState, providerError: null })), []);

  return {
    document, versions, currentVersion, path, forwardPath,
    connected, chats, activeChatId, isDraftChat,
    submitPrompt, selectVersion, selectSection,
    newChat, switchChat, deleteChat, deleteChats, renameChat,
    isProcessing, changedPanes, versionChangedPanes, changedSectionIds, flashSectionIds, activity,
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    providerError: state.providerError, clearProviderError,
    studyMode, studyModeLocked, setStudyMode, submitPrediction,
  };
}
