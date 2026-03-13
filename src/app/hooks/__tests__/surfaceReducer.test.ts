import { describe, it, expect } from 'vitest';
import {
  reduceSurfaceMessage,
  INITIAL_SURFACE_STATE,
  type SurfaceState,
} from '../surfaceReducer.js';
import { buildDocument, buildSection, buildVersionMeta } from '../../../test/helpers.js';
import type { WsMessage } from '../../../shared/types.js';

function state(overrides: Partial<SurfaceState> = {}): SurfaceState {
  return { ...INITIAL_SURFACE_STATE, ...overrides };
}

/** Build a minimal valid session-init message. */
function sessionInit(overrides: Partial<Extract<WsMessage, { type: 'session-init' }>> = {}): WsMessage {
  return { type: 'session-init', sessionDir: '', versions: [], chats: [], ...overrides };
}

describe('reduceSurfaceMessage', () => {
  // ═══════════════════════════════════════════════════════════════════
  // session-init
  // ═══════════════════════════════════════════════════════════════════

  describe('session-init', () => {
    it('resets processing state regardless of prior state', () => {
      const s = state({ isProcessing: true, activity: { label: 'x', toolName: 'x', step: 1 } });
      const result = reduceSurfaceMessage(s, sessionInit(), null);

      expect(result.state.isProcessing).toBe(false);
      expect(result.state.activity).toBeNull();
      expect(result.state.changedPanes.size).toBe(0);
    });

    it('sets document to null when message has no document', () => {
      const doc = buildDocument();
      const s = state({ document: doc });
      const result = reduceSurfaceMessage(s, sessionInit(), doc);

      expect(result.state.document).toBeNull();
      expect(result.state.currentVersion).toBe(0);
      expect(result.prevDoc).toBeNull();
    });

    it('uses provided chats and preserves activeChatId when omitted', () => {
      const s = state({ activeChatId: 'c1' });
      const chats = [{ id: 'c2', title: 'X', createdAt: '', updatedAt: '' }];
      const result = reduceSurfaceMessage(s, sessionInit({ chats }), null);

      expect(result.state.chats).toEqual(chats);
      expect(result.state.activeChatId).toBe('c1');
    });

    it('emits auto-select-providers effect when providers are present', () => {
      const providers = [{ id: 'p1', name: 'P1', models: [] }];
      const result = reduceSurfaceMessage(state(), sessionInit({ providers }), null);

      expect(result.effects).toEqual([
        { type: 'auto-select-providers', providers },
      ]);
    });

    it('emits no effects when providers are absent', () => {
      const result = reduceSurfaceMessage(state(), sessionInit(), null);
      expect(result.effects).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // document-update
  // ═══════════════════════════════════════════════════════════════════

  describe('document-update', () => {
    it('no-ops when message has no document (only versions)', () => {
      const versions = [buildVersionMeta({ version: 1 })];
      const s = state({ currentVersion: 1 });
      const msg: WsMessage = { type: 'document-update', versions };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.document).toBeNull();
      expect(result.state.versions).toEqual(versions);
      expect(result.effects).toEqual([]);
    });

    it('returns unchanged state when message has neither document nor versions', () => {
      const s = state();
      const msg: WsMessage = { type: 'document-update' };
      const result = reduceSurfaceMessage(s, msg, null);
      expect(result.state).toEqual(s);
    });

    it('detects changed panes when prevDoc exists', () => {
      const prevDoc = buildDocument({
        sections: [buildSection({ title: 'A', explanation: 'old' })],
      });
      const nextDoc = buildDocument({
        sections: [buildSection({ title: 'A', explanation: 'new' })],
      });
      const s = state();
      const msg: WsMessage = { type: 'document-update', document: nextDoc };
      const result = reduceSurfaceMessage(s, msg, prevDoc);

      expect(result.state.changedPanes.has('explanation')).toBe(true);
      expect(result.effects).toContainEqual({ type: 'schedule-flash-clear' });
    });

    it('skips change detection when prevDoc is null (first load)', () => {
      const nextDoc = buildDocument();
      const s = state();
      const msg: WsMessage = { type: 'document-update', document: nextDoc };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.changedPanes.size).toBe(0);
      expect(result.effects).not.toContainEqual({ type: 'schedule-flash-clear' });
    });

    it('always emits reset-settle-timer when document is present', () => {
      const doc = buildDocument();
      const msg: WsMessage = { type: 'document-update', document: doc };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.effects).toContainEqual({ type: 'reset-settle-timer' });
    });

    it('updates prevDoc to the new document', () => {
      const doc = buildDocument({ version: 5 });
      const msg: WsMessage = { type: 'document-update', document: doc };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.prevDoc).toBe(doc);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // version-change
  // ═══════════════════════════════════════════════════════════════════

  describe('version-change', () => {
    it('updates version number without touching other state', () => {
      const s = state({ currentVersion: 1, isProcessing: true });
      const msg: WsMessage = { type: 'version-change', version: 3 };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.currentVersion).toBe(3);
      expect(result.state.isProcessing).toBe(true);
    });

    it('preserves currentVersion when message omits version', () => {
      const s = state({ currentVersion: 5 });
      const msg: WsMessage = { type: 'version-change' };
      const result = reduceSurfaceMessage(s, msg, null);
      expect(result.state.currentVersion).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // chat-list
  // ═══════════════════════════════════════════════════════════════════

  describe('chat-list', () => {
    it('updates chats and activeChatId', () => {
      const chats = [{ id: 'c2', title: 'Y', createdAt: '', updatedAt: '' }];
      const msg: WsMessage = { type: 'chat-list', chats, activeChatId: 'c2' };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.state.chats).toEqual(chats);
      expect(result.state.activeChatId).toBe('c2');
    });

    it('preserves activeChatId when message omits it', () => {
      const s = state({ activeChatId: 'c1' });
      const chats = [{ id: 'c1', title: 'X', createdAt: '', updatedAt: '' }];
      const msg: WsMessage = { type: 'chat-list', chats };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.activeChatId).toBe('c1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // provider-error
  // ═══════════════════════════════════════════════════════════════════

  describe('provider-error', () => {
    it('sets error and stops processing', () => {
      const s = state({ isProcessing: true, activity: { label: 'x', toolName: 'x', step: 1 } });
      const msg: WsMessage = { type: 'provider-error', error: 'Rate limited' };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.providerError).toBe('Rate limited');
      expect(result.state.isProcessing).toBe(false);
      expect(result.state.activity).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // tool-progress
  // ═══════════════════════════════════════════════════════════════════

  describe('tool-progress', () => {
    it('sets activity with resolved label', () => {
      const msg: WsMessage = { type: 'tool-progress', toolName: 'show_visual', step: 2 };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.state.activity).toEqual({
        label: 'Building visual',
        toolName: 'show_visual',
        step: 2,
      });
    });

    it('falls back to raw name for unknown tool', () => {
      const msg: WsMessage = { type: 'tool-progress', toolName: 'custom_tool', step: 1 };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.state.activity!.label).toBe('custom_tool');
    });

    it('defaults step to 0 when omitted', () => {
      const msg: WsMessage = { type: 'tool-progress', toolName: 'thinking' };
      const result = reduceSurfaceMessage(state(), msg, null);
      expect(result.state.activity!.step).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // preflight-result
  // ═══════════════════════════════════════════════════════════════════

  describe('preflight-result', () => {
    it('emits send-pending-prompt on success', () => {
      const msg: WsMessage = { type: 'preflight-result', ok: true };
      const result = reduceSurfaceMessage(state(), msg, null);

      expect(result.effects).toContainEqual({ type: 'send-pending-prompt' });
      // State unchanged on success
      expect(result.state.isProcessing).toBe(false);
    });

    it('sets error and stops processing on failure', () => {
      const s = state({ isProcessing: true });
      const msg: WsMessage = { type: 'preflight-result', ok: false, error: 'API key invalid' };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.providerError).toBe('API key invalid');
      expect(result.state.isProcessing).toBe(false);
      expect(result.state.activity).toBeNull();
      expect(result.effects).toContainEqual({ type: 'clear-pending-prompt' });
    });

    it('uses fallback error when error is undefined on failure', () => {
      const msg: WsMessage = { type: 'preflight-result', ok: false };
      const result = reduceSurfaceMessage(state(), msg, null);
      expect(result.state.providerError).toBe('Provider is unavailable');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // prompt-complete
  // ═══════════════════════════════════════════════════════════════════

  describe('prompt-complete', () => {
    it('stops processing and emits clear-settle-timer', () => {
      const s = state({ isProcessing: true, activity: { label: 'x', toolName: 'x', step: 3 } });
      const msg: WsMessage = { type: 'prompt-complete' };
      const result = reduceSurfaceMessage(s, msg, null);

      expect(result.state.isProcessing).toBe(false);
      expect(result.state.activity).toBeNull();
      expect(result.effects).toContainEqual({ type: 'clear-settle-timer' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // unknown message type
  // ═══════════════════════════════════════════════════════════════════

  describe('unknown message type', () => {
    it('returns state unchanged', () => {
      const s = state({ currentVersion: 5 });
      const msg = { type: 'never-seen' } as unknown as WsMessage;
      const result = reduceSurfaceMessage(s, msg, null);
      expect(result.state).toEqual(s);
      expect(result.effects).toEqual([]);
    });
  });
});
