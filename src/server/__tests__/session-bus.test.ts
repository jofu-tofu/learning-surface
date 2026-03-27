import { describe, it, expect, vi } from 'vitest';
import { createSessionBus, type SessionBusDeps } from '../session-bus.js';
import { createDocumentService } from '../document-service.js';
import {
  buildDocument,
  spyVersionStore,
  fakeFileIO,
  buildVersionMeta,
} from '../../test/helpers.js';
import { serializeSurface } from '../surface-file.js';
import type { LearningDocument } from '../../shared/document.js';
import type { Chat } from '../../shared/session.js';
import type { ChatStore } from '../chat-store.js';
import type { FileWatcherService } from '../types.js';
import type { WsMessage } from '../../shared/messages.js';

// ── Helpers ─────────────────────────────────────────────────────────

function fakeChatStore(chats: Chat[] = []): ChatStore {
  const store: Chat[] = [...chats];
  return {
    init: vi.fn(async () => {}),
    listChats: vi.fn(() => [...store]),
    createChat: vi.fn(() => {
      const chat: Chat = {
        id: `chat-${store.length + 1}`,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.push(chat);
      return chat;
    }),
    getChat: vi.fn((id: string) => store.find((c) => c.id === id)),
    updateChatTitle: vi.fn(async (id: string, title: string) => {
      const chat = store.find((c) => c.id === id);
      if (chat) chat.title = title;
    }),
    touchChat: vi.fn(async () => {}),
    deleteChat: vi.fn(async (id: string) => {
      const idx = store.findIndex((c) => c.id === id);
      if (idx >= 0) store.splice(idx, 1);
    }),
    getChatDir: vi.fn((id: string) => `/data/chats/${id}`),
    save: vi.fn(async () => {}),
  };
}

function fakeWatcher(): FileWatcherService & {
  fireChange: (doc: LearningDocument) => void;
} {
  let callback: ((doc: LearningDocument) => void) | null = null;
  return {
    onDocumentChange: vi.fn((cb: (doc: LearningDocument) => void) => {
      callback = cb;
    }),
    start: vi.fn(),
    stop: vi.fn(),
    fireChange(doc: LearningDocument) {
      if (callback) callback(doc);
    },
  };
}

function makeDeps(overrides: Partial<SessionBusDeps> = {}) {
  const io = fakeFileIO();
  const documentService = createDocumentService(io);
  const broadcast = vi.fn<(msg: WsMessage) => void>();
  const versionStore = spyVersionStore();
  const initVersionStore = vi.fn(async () => versionStore);
  const watcher = fakeWatcher();
  const chatStore = fakeChatStore();

  const deps: SessionBusDeps = {
    chatStore,
    broadcast,
    initVersionStore,
    documentService,
    watcher,
    ...overrides,
  };

  return { deps, broadcast, chatStore, versionStore, initVersionStore, watcher, io, documentService };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('createSessionBus', () => {
  it('starts with null state', () => {
    const { deps } = makeDeps();
    const bus = createSessionBus(deps);
    expect(bus.activeChatId).toBeNull();
    expect(bus.activeVersionStore).toBeNull();
    expect(bus.latestDocument).toBeNull();
  });

  // ── documentChanged ───────────────────────────────────────────

  describe('documentChanged', () => {
    it('updates latestDocument and broadcasts document-update with versions', async () => {
      const chat: Chat = { id: 'c1', title: 'Topic', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
      const chatStore = fakeChatStore([chat]);
      const { deps, broadcast, versionStore, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const versions = [buildVersionMeta({ version: 1 })];
      versionStore.listVersions = vi.fn(async () => versions);

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');
      broadcast.mockClear();

      const doc = buildDocument({ summary: 'TCP Basics' });
      await bus.documentChanged(doc);

      expect(bus.latestDocument).toBe(doc);
      expect(broadcast).toHaveBeenCalledWith({
        type: 'document-update',
        document: doc,
        versions,
      });
    });

    it('auto-names chat when summary is present and title is "New Chat"', async () => {
      const chat: Chat = {
        id: 'c1',
        title: 'New Chat',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const chatStore = fakeChatStore([chat]);
      const { deps, broadcast, io, documentService } = makeDeps({ chatStore });

      // Write a surface file so switchToChat can read it
      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');

      const doc = buildDocument({ summary: 'TCP Basics' });
      await bus.documentChanged(doc);

      expect(chatStore.updateChatTitle).toHaveBeenCalledWith('c1', 'TCP Basics');
      // Should also broadcast chat-list after rename
      const chatListMsg = broadcast.mock.calls.find(
        ([msg]) => msg.type === 'chat-list',
      );
      expect(chatListMsg).toBeDefined();
    });

    it('does not auto-name when chat already has a custom title', async () => {
      const chat: Chat = {
        id: 'c1',
        title: 'My Topic',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const chatStore = fakeChatStore([chat]);
      const { deps, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');

      await bus.documentChanged(buildDocument({ summary: 'TCP Basics' }));
      expect(chatStore.updateChatTitle).not.toHaveBeenCalled();
    });
  });

  // ── completedWithDocument ─────────────────────────────────────

  describe('completedWithDocument', () => {
    it('broadcasts document-update, touches chat, and broadcasts chat-list', async () => {
      const chat: Chat = {
        id: 'c1',
        title: 'Topic',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const chatStore = fakeChatStore([chat]);
      const { deps, broadcast, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');
      broadcast.mockClear();

      const doc = buildDocument({ version: 2 });
      await bus.completedWithDocument(doc);

      expect(bus.latestDocument).toBe(doc);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'document-update', document: doc }),
      );
      expect(chatStore.touchChat).toHaveBeenCalledWith('c1');
      const chatListMsg = broadcast.mock.calls.find(
        ([msg]) => msg.type === 'chat-list',
      );
      expect(chatListMsg).toBeDefined();
    });
  });

  // ── chatListChanged ───────────────────────────────────────────

  describe('chatListChanged', () => {
    it('broadcasts chat-list with current chats and activeChatId', async () => {
      const chat: Chat = {
        id: 'c1',
        title: 'Topic',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const chatStore = fakeChatStore([chat]);
      const { deps, broadcast, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');
      broadcast.mockClear();

      bus.chatListChanged();

      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chat-list',
          activeChatId: 'c1',
        }),
      );
    });
  });

  // ── broadcastFullState ────────────────────────────────────────

  describe('broadcastFullState', () => {
    it('broadcasts session-init with full state', async () => {
      const chat: Chat = { id: 'c1', title: 'Topic', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
      const chatStore = fakeChatStore([chat]);
      const { deps, broadcast, versionStore, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const versions = [buildVersionMeta({ version: 1 })];
      versionStore.listVersions = vi.fn(async () => versions);

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');
      broadcast.mockClear();

      await bus.broadcastFullState();

      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'session-init', versions }),
      );
    });
  });

  // ── switchToChat ──────────────────────────────────────────────

  describe('switchToChat', () => {
    it('stops watcher, updates state, loads version store, starts watcher', async () => {
      const chat: Chat = {
        id: 'c1',
        title: 'Topic',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const chatStore = fakeChatStore([chat]);
      const { deps, watcher, initVersionStore, versionStore, io, documentService } =
        makeDeps({ chatStore });

      const doc = buildDocument({ version: 3 });
      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(doc));

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');

      expect(watcher.stop).toHaveBeenCalled();
      expect(bus.activeChatId).toBe('c1');
      expect(initVersionStore).toHaveBeenCalledWith('c1');
      expect(bus.activeVersionStore).toBe(versionStore);
      expect(bus.latestDocument).toMatchObject({ version: 3 });
      expect(watcher.start).toHaveBeenCalledWith('/data/chats/c1');
    });
  });

  // ── ensureActiveChat ──────────────────────────────────────────

  describe('ensureActiveChat', () => {
    it('switches to most recent chat when chats exist', async () => {
      const older: Chat = {
        id: 'c-old',
        title: 'Old',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const newer: Chat = {
        id: 'c-new',
        title: 'New',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      };
      const chatStore = fakeChatStore([older, newer]);
      const { deps, io, documentService } = makeDeps({ chatStore });

      // Provide surface files for both chats
      for (const c of [older, newer]) {
        const fp = documentService.filePath(chatStore.getChatDir(c.id));
        io.files.set(fp, serializeSurface(buildDocument()));
      }

      const bus = createSessionBus(deps);
      await bus.ensureActiveChat();

      expect(bus.activeChatId).toBe('c-new');
    });

    it('clears state when no chats exist', async () => {
      const { deps, watcher } = makeDeps();
      const bus = createSessionBus(deps);

      await bus.ensureActiveChat();

      expect(bus.activeChatId).toBeNull();
      expect(bus.activeVersionStore).toBeNull();
      expect(bus.latestDocument).toBeNull();
      expect(watcher.stop).toHaveBeenCalled();
    });
  });

  // ── toolProgress ──────────────────────────────────────────────

  describe('toolProgress', () => {
    it('broadcasts tool-progress', () => {
      const { deps, broadcast } = makeDeps();
      const bus = createSessionBus(deps);

      bus.toolProgress('design_surface', 2);

      expect(broadcast).toHaveBeenCalledWith({
        type: 'tool-progress',
        toolName: 'design_surface',
        step: 2,
      });
    });
  });

  // ── providerError ─────────────────────────────────────────────

  describe('providerError', () => {
    it('broadcasts provider-error', () => {
      const { deps, broadcast } = makeDeps();
      const bus = createSessionBus(deps);

      bus.providerError('Rate limit exceeded');

      expect(broadcast).toHaveBeenCalledWith({
        type: 'provider-error',
        error: 'Rate limit exceeded',
      });
    });
  });

  // ── buildSessionInit ──────────────────────────────────────────

  describe('buildSessionInit', () => {
    it('returns session-init message with providers when supplied', async () => {
      const chat: Chat = { id: 'c1', title: 'Topic', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
      const chatStore = fakeChatStore([chat]);
      const { deps, versionStore, io, documentService } = makeDeps({ chatStore });

      const filePath = documentService.filePath(chatStore.getChatDir('c1'));
      io.files.set(filePath, serializeSurface(buildDocument()));

      const versions = [buildVersionMeta({ version: 1 })];
      versionStore.listVersions = vi.fn(async () => versions);

      const bus = createSessionBus(deps);
      await bus.switchToChat('c1');

      const providers = [{ id: 'openai', name: 'OpenAI', models: [], type: 'api' as const }];
      const msg = await bus.buildSessionInit(providers);

      expect(msg.type).toBe('session-init');
      expect(msg.providers).toBe(providers);
      expect(msg.versions).toEqual(versions);
    });

    it('returns session-init without providers when omitted', async () => {
      const { deps } = makeDeps();
      const bus = createSessionBus(deps);

      const msg = await bus.buildSessionInit();

      expect(msg.type).toBe('session-init');
      expect(msg.providers).toBeUndefined();
    });
  });

  // ── Watcher integration ───────────────────────────────────────

  describe('watcher integration', () => {
    it('calls documentChanged when watcher fires', async () => {
      const { deps, watcher } = makeDeps();
      const bus = createSessionBus(deps);

      const doc = buildDocument({ summary: 'From watcher' });
      watcher.fireChange(doc);

      // Give the async callback a tick to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(bus.latestDocument).toBe(doc);
    });
  });
});
