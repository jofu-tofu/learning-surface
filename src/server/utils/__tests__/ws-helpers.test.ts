import { describe, it, expect, vi } from 'vitest';
import {
  buildSessionInitMessage,
  buildChatListMessage,
  formatError,
  ensureActiveChat,
} from '../ws-helpers.js';
import type { ChatStore } from '../../chat-store.js';

describe('buildSessionInitMessage', () => {
  it('converts null document to undefined', () => {
    const msg = buildSessionInitMessage({
      sessionDir: '/dir',
      document: null,
      versions: [],
      chats: [],
    });
    expect(msg.type).toBe('session-init');
    expect(msg.document).toBeUndefined();
  });

  it('converts null activeChatId to undefined', () => {
    const msg = buildSessionInitMessage({
      sessionDir: '/dir',
      versions: [],
      chats: [],
      activeChatId: null,
    });
    expect(msg.activeChatId).toBeUndefined();
  });
});

describe('buildChatListMessage', () => {
  it('converts null activeChatId to undefined', () => {
    const msg = buildChatListMessage([], null);
    expect(msg.type).toBe('chat-list');
    expect(msg.activeChatId).toBeUndefined();
  });

  it('preserves activeChatId when provided', () => {
    const msg = buildChatListMessage([], 'chat-1');
    expect(msg.activeChatId).toBe('chat-1');
  });
});

describe('formatError', () => {
  it('extracts message from Error instance', () => {
    expect(formatError(new Error('boom'))).toBe('boom');
  });

  it('converts non-Error to string', () => {
    expect(formatError(42)).toBe('42');
    expect(formatError(null)).toBe('null');
    expect(formatError(undefined)).toBe('undefined');
  });
});

describe('ensureActiveChat', () => {
  function fakeChatStore(chats: Array<{ id: string; updatedAt: string }>): ChatStore {
    const fullChats = chats.map(c => ({
      ...c, title: c.id, createdAt: '2025-01-01T00:00:00Z',
    }));
    let created: typeof fullChats[number] | null = null;
    return {
      listChats: () => [...fullChats, ...(created ? [created] : [])],
      createChat: () => {
        created = { id: 'new-chat', title: 'New', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' };
        return created;
      },
      save: vi.fn(async () => {}),
      // Unused stubs
      init: vi.fn(), getChat: vi.fn(), updateChatTitle: vi.fn(),
      deleteChat: vi.fn(), getChatDir: vi.fn(),
    } as unknown as ChatStore;
  }

  it('switches to most recent chat when chats exist', async () => {
    const switchFn = vi.fn(async () => {});
    const store = fakeChatStore([
      { id: 'old', updatedAt: '2025-01-01T00:00:00Z' },
      { id: 'recent', updatedAt: '2025-06-01T00:00:00Z' },
    ]);
    await ensureActiveChat(store, switchFn);
    expect(switchFn).toHaveBeenCalledWith('recent');
  });

  it('does nothing when no chats exist (client enters draft mode)', async () => {
    const switchFn = vi.fn(async () => {});
    const store = fakeChatStore([]);
    await ensureActiveChat(store, switchFn);
    expect(switchFn).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });
});
