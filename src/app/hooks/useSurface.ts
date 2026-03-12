import { useState, useCallback } from 'react';
import type { LearningDocument, VersionMeta, WsMessage } from '../../shared/types.js';
import { useWebSocket } from './useWebSocket.js';

export interface UseSurfaceReturn {
  document: LearningDocument | null;
  versions: VersionMeta[];
  currentVersion: number;
  connected: boolean;
  submitPrompt: (text: string) => void;
  selectVersion: (version: number) => void;
  selectSection: (sectionId: string) => void;
}

const WS_URL = 'ws://localhost:8080';

export function useSurface(): UseSurfaceReturn {
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);

  const onMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'session-init':
        if (msg.document) {
          setDocument(msg.document);
          setCurrentVersion(msg.document.version);
        }
        if (msg.versions) {
          setVersions(msg.versions);
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
    }
  }, []);

  const { connected, send } = useWebSocket({ url: WS_URL, onMessage });

  const submitPrompt = useCallback((text: string) => {
    send({ type: 'prompt', text });
  }, [send]);

  const selectVersion = useCallback((version: number) => {
    setCurrentVersion(version);
    send({ type: 'select-version', version });
  }, [send]);

  const selectSection = useCallback((sectionId: string) => {
    if (document) {
      setDocument({ ...document, activeSection: sectionId });
    }
    send({ type: 'select-section', sectionId });
  }, [document, send]);

  return {
    document,
    versions,
    currentVersion,
    connected,
    submitPrompt,
    selectVersion,
    selectSection,
  };
}
