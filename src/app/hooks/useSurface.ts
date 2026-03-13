import { useState, useCallback, useMemo, useRef } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat, ClientMessage } from '../../shared/types.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { getVersionPath, getForwardPath } from '../../shared/version-tree.js';
import { getToolLabel } from '../../shared/tool-labels.js';
import { useWebSocket } from './useWebSocket.js';
import { detectChangedPanes } from '../utils/detectChangedPanes.js';
import { useProviderSelection } from './useProviderSelection.js';

export interface ToolActivity {
  /** Human-readable label (e.g. "Building diagram") */
  label: string;
  /** Raw tool or phase name (e.g. "show_visual", "thinking") */
  toolName: string;
  /** 1-based step counter (0 for the initial "thinking" phase) */
  step: number;
}

export interface UseSurfaceReturn {
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
    switch (msg.type) {
      case 'session-init':
        setDocument(msg.document ?? null);
        setCurrentVersion(msg.document?.version ?? 0);
        setVersions(msg.versions ?? []);
        if (msg.chats) setChats(msg.chats);
        if (msg.activeChatId) setActiveChatId(msg.activeChatId);
        if (msg.providers) autoSelectProvider(msg.providers);
        prevDocRef.current = msg.document ?? null;
        setIsProcessing(false);
        setActivity(null);
        setChangedPanes(new Set());
        break;

      case 'document-update':
        if (msg.document) {
          const prev = prevDocRef.current;
          const next = msg.document;
          if (prev) {
            const changed = detectChangedPanes(prev, next);
            if (changed.size > 0) {
              setChangedPanes(changed);
              clearTimeout(flashRef.current);
              flashRef.current = setTimeout(() => setChangedPanes(new Set()), 1200);
            }
          }
          prevDocRef.current = next;
          setDocument(next);
          setCurrentVersion(next.version);
          // Reset settle timer
          clearTimeout(settleRef.current);
          settleRef.current = setTimeout(() => {
            setIsProcessing(false);
            setActivity(null);
          }, 2500);
        }
        if (msg.versions) {
          setVersions(msg.versions);
        }
        break;

      case 'version-change':
        if (msg.document) {
          setDocument(msg.document);
        }
        if (msg.version !== undefined) {
          setCurrentVersion(msg.version);
        }
        if (msg.versions) {
          setVersions(msg.versions);
        }
        break;

      case 'chat-list':
        if (msg.chats) {
          setChats(msg.chats);
        }
        if (msg.activeChatId) {
          setActiveChatId(msg.activeChatId);
        }
        break;

      case 'provider-list':
        if (msg.providers) {
          setProviders(msg.providers);
        }
        break;

      case 'provider-error':
        console.error('[provider-error]', msg.error);
        setProviderError(msg.error ?? 'An error occurred with the provider');
        setIsProcessing(false);
        setActivity(null);
        break;

      case 'tool-progress':
        if (msg.toolName !== undefined) {
          setActivity({
            label: getToolLabel(msg.toolName),
            toolName: msg.toolName,
            step: msg.step ?? 0,
          });
        }
        break;

      case 'preflight-result':
        if (msg.ok && pendingPromptRef.current) {
          sendRef.current({ type: 'prompt', ...pendingPromptRef.current });
          pendingPromptRef.current = null;
        } else if (!msg.ok) {
          setProviderError(msg.error ?? 'Provider is unavailable');
          setIsProcessing(false);
          setActivity(null);
          pendingPromptRef.current = null;
        }
        break;

      case 'prompt-complete':
        clearTimeout(settleRef.current);
        setIsProcessing(false);
        setActivity(null);
        break;
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
