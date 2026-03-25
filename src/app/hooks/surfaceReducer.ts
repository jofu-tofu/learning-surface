import type { LearningDocument } from '../../shared/document.js';
import type { WsMessage } from '../../shared/messages.js';
import type { SurfaceSession } from '../../shared/session.js';
import { DRAFT_CHAT_ID } from '../../shared/session.js';
import type { ProviderInfo } from '../../shared/providers.js';
import { getToolLabel } from '../../shared/tool-labels.js';
import { detectChangedPanes } from '../../shared/detectChangedPanes.js';

export interface ToolActivity {
  /** Human-readable label (e.g. "Building diagram") */
  label: string;
  /** Raw tool or phase name (e.g. "show_visual", "thinking") */
  toolName: string;
  /** 1-based step counter (0 for the initial "thinking" phase) */
  step: number;
}

// === Pure state shape ===

/**
 * Full client-side state. Extends the server-owned SurfaceSession
 * (document, versions, chats) with UI-only transient fields
 * (processing indicators, flash animations, etc.).
 */
export interface SurfaceState extends SurfaceSession {
  // --- UI-only transient state (not persisted by the server) ---
  isProcessing: boolean;
  changedPanes: Set<string>;
  /** Panes that changed in the current version compared to the previous version (persists until next version transition). */
  versionChangedPanes: Set<string>;
  activity: ToolActivity | null;
  providerError: string | null;
}

export const INITIAL_SURFACE_STATE: SurfaceState = {
  document: null,
  versions: [],
  currentVersion: 0,
  chats: [],
  activeChatId: null,
  isProcessing: false,
  changedPanes: new Set(),
  versionChangedPanes: new Set(),
  activity: null,
  providerError: null,
};

// === Described side effects (executed by the hook shell) ===

type SurfaceEffect =
  | { type: 'auto-select-providers'; providers: ProviderInfo[] }
  | { type: 'reset-settle-timer' }
  | { type: 'schedule-flash-clear' }
  | { type: 'clear-settle-timer' }
  | { type: 'send-pending-prompt' }
  | { type: 'clear-pending-prompt' };

interface ReducerResult {
  state: SurfaceState;
  effects: SurfaceEffect[];
  /** Updated prevDoc for change detection (carried as a ref in the hook). */
  prevDoc: LearningDocument | null;
}

// === Pure reducer ===

/**
 * Pure state machine: given current state, a WebSocket message, and the
 * previous document (for change detection), returns the next state plus
 * a list of side effects to execute.
 */
export function reduceSurfaceMessage(
  state: SurfaceState,
  msg: WsMessage,
  prevDoc: LearningDocument | null,
): ReducerResult {
  const effects: SurfaceEffect[] = [];

  switch (msg.type) {
    case 'session-init': {
      const doc = msg.document ?? null;
      // Hydrate changed panes from persisted version metadata
      const currentMeta = doc
        ? msg.versions.find(version => version.version === doc.version)
        : undefined;
      const hasActiveChat = Boolean(msg.activeChatId);
      return {
        state: {
          ...state,
          document: doc,
          currentVersion: doc?.version ?? 0,
          versions: msg.versions,
          chats: msg.chats,
          activeChatId: hasActiveChat ? msg.activeChatId! : DRAFT_CHAT_ID,
          isProcessing: false,
          activity: null,
          changedPanes: new Set(),
          versionChangedPanes: new Set(currentMeta?.changedPanes ?? []),
          providerError: state.providerError,
        },
        effects: msg.providers
          ? [{ type: 'auto-select-providers', providers: msg.providers }]
          : [],
        prevDoc: doc,
      };
    }

    case 'document-update': {
      if (!msg.document) {
        return {
          state: msg.versions ? { ...state, versions: msg.versions } : state,
          effects: [],
          prevDoc,
        };
      }

      const next = msg.document;
      let changedPanes = state.changedPanes;
      let { versionChangedPanes } = state;
      const newEffects: SurfaceEffect[] = [{ type: 'reset-settle-timer' }];

      if (prevDoc) {
        const changed = detectChangedPanes(prevDoc, next);

        if (changed.size > 0) {
          newEffects.push({ type: 'schedule-flash-clear' });
          changedPanes = changed;
        }

        // On version transition, capture which panes changed vs the previous version
        if (next.version !== state.currentVersion) {
          versionChangedPanes = detectChangedPanes(prevDoc, next);
        }
      }

      return {
        state: {
          ...state,
          document: next,
          currentVersion: next.version,
          versions: msg.versions ?? state.versions,
          changedPanes,
          versionChangedPanes,
        },
        effects: newEffects,
        prevDoc: next,
      };
    }

    case 'version-change': {
      // Hydrate changed panes from persisted version metadata
      const targetVersion = msg.version ?? state.currentVersion;
      const allVersions = msg.versions ?? state.versions;
      const targetMeta = allVersions.find(version => version.version === targetVersion);
      return {
        state: {
          ...state,
          document: msg.document ?? state.document,
          currentVersion: targetVersion,
          versions: allVersions,
          versionChangedPanes: new Set(targetMeta?.changedPanes ?? []),
        },
        effects: [],
        prevDoc,
      };
    }

    case 'chat-list':
      return {
        state: {
          ...state,
          chats: msg.chats,
          activeChatId: msg.activeChatId ?? state.activeChatId,
        },
        effects: [],
        prevDoc,
      };

    case 'provider-list':
      return {
        state,
        effects: [{ type: 'auto-select-providers', providers: msg.providers }],
        prevDoc,
      };

    case 'provider-error':
      return {
        state: {
          ...state,
          providerError: msg.error,
          isProcessing: false,
          activity: null,
        },
        effects: [],
        prevDoc,
      };

    case 'tool-progress':
      return {
        state: {
          ...state,
          activity: {
            label: getToolLabel(msg.toolName),
            toolName: msg.toolName,
            step: msg.step ?? 0,
          },
        },
        effects: [],
        prevDoc,
      };

    case 'preflight-result': {
      if (msg.ok) {
        effects.push({ type: 'send-pending-prompt' });
      } else {
        effects.push({ type: 'clear-pending-prompt' });
      }
      return {
        state: msg.ok
          ? state
          : {
              ...state,
              providerError: msg.error ?? 'Provider is unavailable',
              isProcessing: false,
              activity: null,
            },
        effects,
        prevDoc,
      };
    }

    case 'prompt-complete':
      return {
        state: {
          ...state,
          isProcessing: false,
          activity: null,
        },
        effects: [{ type: 'clear-settle-timer' }],
        prevDoc,
      };

    default:
      return { state, effects: [], prevDoc };
  }
}
