import { useState, useCallback, useMemo, useRef } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat } from '../../shared/types.js';
import type { ProviderInfo, ReasoningEffort } from '../../shared/providers.js';
import { getVersionPath, getForwardPath } from '../../shared/version-tree.js';
import { useWebSocket } from './useWebSocket.js';

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
  /** Provider/model selection */
  providers: ProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedReasoningEffort: ReasoningEffort | null;
  setSelectedProvider: (id: string) => void;
  setSelectedModel: (id: string) => void;
  setSelectedReasoningEffort: (effort: ReasoningEffort) => void;
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
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProviderState] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [selectedReasoningEffort, setSelectedReasoningEffortState] = useState<ReasoningEffort | null>(null);
  const prevDocRef = useRef<LearningDocument | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'session-init':
        if (msg.document) {
          setDocument(msg.document);
          setCurrentVersion(msg.document.version);
        } else {
          setDocument(null);
          setCurrentVersion(0);
        }
        if (msg.versions) {
          setVersions(msg.versions);
        } else {
          setVersions([]);
        }
        if (msg.chats) {
          setChats(msg.chats);
        }
        if (msg.activeChatId) {
          setActiveChatId(msg.activeChatId);
        }
        if (msg.providers) {
          setProviders(msg.providers);
          // Auto-select first provider and its first model if nothing selected
          if (msg.providers.length > 0) {
            setSelectedProviderState((prev) => {
              if (prev) return prev;
              const p = msg.providers![0];
              const firstModel = p.models[0];
              setSelectedModelState((prevM) => prevM ?? firstModel?.id ?? null);
              setSelectedReasoningEffortState((prevE) => prevE ?? firstModel?.defaultEffort ?? null);
              return p.id;
            });
          }
        }
        prevDocRef.current = msg.document ?? null;
        setIsProcessing(false);
        setChangedPanes(new Set());
        break;

      case 'document-update':
        if (msg.document) {
          const prev = prevDocRef.current;
          const next = msg.document;
          // Detect which panes changed
          if (prev) {
            const changed = new Set<string>();
            const prevActive = prev.sections.find(s => s.id === prev.activeSection);
            const nextActive = next.sections.find(s => s.id === next.activeSection);
            if (JSON.stringify(prevActive?.canvas ?? null) !== JSON.stringify(nextActive?.canvas ?? null)) {
              changed.add('canvas');
            }
            if ((prevActive?.explanation ?? null) !== (nextActive?.explanation ?? null) ||
                JSON.stringify(prevActive?.checks ?? []) !== JSON.stringify(nextActive?.checks ?? []) ||
                JSON.stringify(prevActive?.followups ?? []) !== JSON.stringify(nextActive?.followups ?? [])) {
              changed.add('explanation');
            }
            if (prev.sections.length !== next.sections.length) {
              changed.add('sections');
            }
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
          settleRef.current = setTimeout(() => setIsProcessing(false), 2500);
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

      case 'chat-deleted':
        // Handled via session-init or chat-list that follows
        break;

      case 'provider-list':
        if (msg.providers) {
          setProviders(msg.providers);
        }
        break;

      case 'provider-error':
        console.error('[provider-error]', msg.error);
        setIsProcessing(false);
        break;
    }
  }, []);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });

  const path = useMemo(() => getVersionPath(currentVersion, versions), [currentVersion, versions]);
  const forwardPath = useMemo(() => getForwardPath(currentVersion, versions), [currentVersion, versions]);

  const submitPrompt = useCallback((text: string) => {
    setIsProcessing(true);
    send({
      type: 'prompt',
      text,
      fromVersion: currentVersion,
      provider: selectedProvider,
      model: selectedModel,
      reasoningEffort: selectedReasoningEffort ?? undefined,
    });
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

  const setSelectedProvider = useCallback((id: string) => {
    setSelectedProviderState(id);
    // Auto-select first model of the new provider and its default effort
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
    // Auto-select default effort for the new model
    const p = providers.find((p) => p.id === selectedProvider);
    const model = p?.models.find((m) => m.id === id);
    setSelectedReasoningEffortState(model?.defaultEffort ?? null);
  }, [providers, selectedProvider]);

  const setSelectedReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setSelectedReasoningEffortState(effort);
  }, []);

  return {
    document, versions, currentVersion, path, forwardPath,
    connected, chats, activeChatId,
    submitPrompt, selectVersion, selectSection,
    newChat, switchChat, deleteChat,
    isProcessing, changedPanes,
    providers, selectedProvider, selectedModel, selectedReasoningEffort,
    setSelectedProvider, setSelectedModel, setSelectedReasoningEffort,
  };
}
