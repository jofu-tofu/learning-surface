import type { LearningDocument, VersionMeta, WsMessage, Chat } from '../../shared/types.js';
import type { ProviderInfo } from '../../shared/providers.js';
import { getToolLabel } from '../../shared/tool-labels.js';
import { detectChangedPanes, detectChangedSections } from '../../shared/detectChangedPanes.js';

export interface ToolActivity {
  /** Human-readable label (e.g. "Building diagram") */
  label: string;
  /** Raw tool or phase name (e.g. "show_visual", "thinking") */
  toolName: string;
  /** 1-based step counter (0 for the initial "thinking" phase) */
  step: number;
}

// === Pure state shape ===

export interface SurfaceState {
  document: LearningDocument | null;
  versions: VersionMeta[];
  currentVersion: number;
  chats: Chat[];
  activeChatId: string | null;
  /** True when the active "chat" is a local draft that hasn't been persisted yet. */
  isDraftChat: boolean;
  isProcessing: boolean;
  changedPanes: Set<string>;
  /** Panes that changed in the current version compared to the previous version (persists until next version transition). */
  versionChangedPanes: Set<string>;
  /** Section IDs that were added or modified in the current version (persists until next version transition). */
  changedSectionIds: Set<string>;
  /** Section IDs that changed in the most recent streaming update (1.2s flash lifetime, like changedPanes). */
  flashSectionIds: Set<string>;
  activity: ToolActivity | null;
  providerError: string | null;
}

export const INITIAL_SURFACE_STATE: SurfaceState = {
  document: null,
  versions: [],
  currentVersion: 0,
  chats: [],
  activeChatId: null,
  isDraftChat: false,
  isProcessing: false,
  changedPanes: new Set(),
  versionChangedPanes: new Set(),
  changedSectionIds: new Set(),
  flashSectionIds: new Set(),
  activity: null,
  providerError: null,
};

// === Described side effects (executed by the hook shell) ===

type SurfaceEffect =
  | { type: 'auto-select-providers'; providers: ProviderInfo[] }
  | { type: 'set-providers'; providers: ProviderInfo[] }
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
      return {
        state: {
          ...state,
          document: doc,
          currentVersion: doc?.version ?? 0,
          versions: msg.versions,
          chats: msg.chats,
          activeChatId: msg.activeChatId ?? state.activeChatId,
          isDraftChat: false,
          isProcessing: false,
          activity: null,
          changedPanes: new Set(),
          versionChangedPanes: new Set(currentMeta?.changedPanes ?? []),
          changedSectionIds: new Set(currentMeta?.changedSectionIds ?? []),
          flashSectionIds: new Set(),
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
      let { versionChangedPanes, changedSectionIds } = state;
      let flashSectionIds = state.flashSectionIds;
      const newEffects: SurfaceEffect[] = [{ type: 'reset-settle-timer' }];

      if (prevDoc) {
        const changed = detectChangedPanes(prevDoc, next);
        const changedSects = detectChangedSections(prevDoc, next);

        if (changed.size > 0 || changedSects.size > 0) {
          newEffects.push({ type: 'schedule-flash-clear' });
        }
        if (changed.size > 0) {
          changedPanes = changed;
        }
        if (changedSects.size > 0) {
          flashSectionIds = changedSects;
        }

        // On version transition, capture which panes/sections changed vs the previous version
        if (next.version !== state.currentVersion) {
          versionChangedPanes = detectChangedPanes(prevDoc, next);
          changedSectionIds = detectChangedSections(prevDoc, next);
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
          changedSectionIds,
          flashSectionIds,
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
          changedSectionIds: new Set(targetMeta?.changedSectionIds ?? []),
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
          isDraftChat: msg.activeChatId ? false : state.isDraftChat,
        },
        effects: [],
        prevDoc,
      };

    case 'provider-list':
      return {
        state,
        effects: [{ type: 'set-providers', providers: msg.providers }],
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
