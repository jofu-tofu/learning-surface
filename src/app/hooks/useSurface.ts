import { useState, useCallback, useMemo, useRef } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat, ClientMessage } from '../../shared/types.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { getVersionPath, getForwardPath } from '../../shared/version-tree.js';
import { useWebSocket } from './useWebSocket.js';
import { useProviderSelection } from './useProviderSelection.js';
import { reduceSurfaceMessage } from './surfaceReducer.js';

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
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [changedPanes, setChangedPanes] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<ToolActivity | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const {
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setProviders, setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    autoSelect: autoSelectProvider,
  } = useProviderSelection();
  const prevDocRef = useRef<LearningDocument | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingPromptRef = useRef<Omit<Extract<ClientMessage, { type: 'prompt' }>, 'type'> | null>(null);
  const sendRef = useRef<(data: unknown) => void>(() => {});

  const onMessage = useCallback((msg: WsMessage) => {
    const prev = prevDocRef.current;
    const result = reduceSurfaceMessage(
      { document, versions, currentVersion, chats, activeChatId,
        isProcessing, changedPanes, activity, providerError },
      msg,
      prev,
    );

    // Apply state updates
    const s = result.state;
    setDocument(s.document);
    setVersions(s.versions);
    setCurrentVersion(s.currentVersion);
    setChats(s.chats);
    setActiveChatId(s.activeChatId);
    setIsProcessing(s.isProcessing);
    setChangedPanes(s.changedPanes);
    setActivity(s.activity);
    setProviderError(s.providerError);
    prevDocRef.current = result.prevDoc;

    // Execute side effects
    for (const effect of result.effects) {
      switch (effect.type) {
        case 'auto-select-providers':
          autoSelectProvider(effect.providers);
          break;
        case 'set-providers':
          setProviders(effect.providers);
          break;
        case 'reset-settle-timer':
          clearTimeout(settleRef.current);
          settleRef.current = setTimeout(() => {
            setIsProcessing(false);
            setActivity(null);
          }, 2500);
          break;
        case 'schedule-flash-clear':
          clearTimeout(flashRef.current);
          flashRef.current = setTimeout(() => setChangedPanes(new Set()), 1200);
          break;
        case 'clear-settle-timer':
          clearTimeout(settleRef.current);
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

    // Log provider errors
    if (msg.type === 'provider-error') {
      console.error('[provider-error]', msg.error);
    }
  }, []);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });
  sendRef.current = send;

  const path = useMemo(() => getVersionPath(currentVersion, versions), [currentVersion, versions]);
  const forwardPath = useMemo(() => getForwardPath(currentVersion, versions), [currentVersion, versions]);

  const submitPrompt = useCallback((text: string) => {
    setIsProcessing(true);
    setProviderError(null);

    if (!selectedProvider || !selectedModel) {
      // No provider selected — send directly (legacy behavior for REPL mode)
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
    setCurrentVersion(version);
    send({ type: 'select-version', version });
  }, [send]);

  const selectSection = useCallback((sectionId: string) => {
    setDocument(prev => prev ? { ...prev, activeSection: sectionId } : prev);
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

  const clearProviderError = useCallback(() => setProviderError(null), []);

  return {
    document, versions, currentVersion, path, forwardPath,
    connected, chats, activeChatId,
    submitPrompt, selectVersion, selectSection,
    newChat, switchChat, deleteChat,
    isProcessing, changedPanes, activity,
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
    providerError, clearProviderError,
  };
}
