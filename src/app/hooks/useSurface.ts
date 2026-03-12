import { useState, useCallback, useMemo } from 'react';
import type { LearningDocument, VersionMeta, WsMessage, Chat } from '../../shared/types.js';
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
}

const WS_URL = 'ws://localhost:8080';

export function useSurface(): UseSurfaceReturn {
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

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
        break;

      case 'document-update':
        if (msg.document) {
          setDocument(msg.document);
          setCurrentVersion(msg.document.version);
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
    }
  }, []);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });

  const path = useMemo(() => getVersionPath(currentVersion, versions), [currentVersion, versions]);
  const forwardPath = useMemo(() => getForwardPath(currentVersion, versions), [currentVersion, versions]);

  const submitPrompt = useCallback((text: string) => {
    send({ type: 'prompt', text, fromVersion: currentVersion });
  }, [send, currentVersion]);

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

  return {
    document, versions, currentVersion, path, forwardPath,
    connected, chats, activeChatId,
    submitPrompt, selectVersion, selectSection,
    newChat, switchChat, deleteChat,
  };
}
