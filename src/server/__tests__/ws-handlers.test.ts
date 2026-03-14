import { describe, it, expect, vi } from 'vitest';
import { routeMessage, type SessionState } from '../ws-handlers.js';
import { handlePrompt } from '../prompt-handler.js';
import { createDocumentService } from '../document-service.js';
import type { ChatStore } from '../chat-store.js';
import type { ClientMessage, WsMessage, WsProviderError } from '../../shared/types.js';
import {
  MINIMAL_DOC,
  fakeFileIO,
  fakeProvider,
  fakeContextCompiler,
  spyVersionStore,
  buildVersionMeta,
} from '../../test/helpers.js';

// === Fake WebSocket (captures sent messages) ===

interface FakeWs {
  send(data: string): void;
  sent: WsMessage[];
}

function fakeWs(): FakeWs {
  const sent: WsMessage[] = [];
  return {
    send(data: string) { sent.push(JSON.parse(data)); },
    sent,
  };
}

// === Minimal ChatStore stub ===

function fakeChatStore(chatDir = '/chat'): ChatStore {
  const chat = { id: 'c1', title: 'Test', createdAt: '', updatedAt: '' };
  return {
    async init() {},
    listChats: () => [chat],
    createChat: () => chat,
    getChat: (id: string) => id === 'c1' ? chat : undefined,
    async updateChatTitle() {},
    async deleteChat() {},
    getChatDir: () => chatDir,
    async save() {},
  };
}

// === Test helpers ===

function setup(opts: {
  toolCalls?: Array<{ toolName: string; params: Record<string, unknown> }>;
  providerType?: 'api' | 'cli';
  initialDoc?: string;
} = {}) {
  const io = fakeFileIO(new Map([
    ['/chat/current.md', opts.initialDoc ?? MINIMAL_DOC],
  ]));
  const documentService = createDocumentService(io);
  const store = spyVersionStore();
  const provider = fakeProvider(opts.toolCalls ?? [], {
    type: opts.providerType ?? 'api',
  });

  const state: SessionState = {
    activeChatId: 'c1',
    activeVersionStore: store,
    latestDocument: null,
  };

  const broadcast = vi.fn<(msg: WsMessage) => void>();
  const ws = fakeWs();

  // Wrap handlePrompt with test deps so the fake provider/documentService are used
  const promptDeps = {
    documentService: documentService,
    contextCompiler: fakeContextCompiler(),
    getProvider: (id: string) => id === 'fake' ? provider : undefined,
  };

  const deps = {
    state,
    chatStore: fakeChatStore(),
    broadcast,
    switchToChat: vi.fn(),
    documentService,
    onPrompt: ((req: Parameters<typeof handlePrompt>[0]) =>
      handlePrompt(req, promptDeps)) as typeof handlePrompt,
  };

  async function send(msg: ClientMessage) {
    await routeMessage(ws as unknown as import('ws').WebSocket, msg, deps);
  }

  return { ws, state, broadcast, deps, store, provider, promptDeps, send };
}

describe('ws-handlers prompt flow', () => {
  it('sends prompt-complete after successful prompt', async () => {
    const { ws, send } = setup({
      toolCalls: [{ toolName: 'explain', params: { content: 'Hello' } }],
    });

    await send({
      type: 'prompt',
      text: 'explain something',
      provider: 'fake',
      model: 'fake-model',
    });

    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeDefined();
  });

  it('sends prompt-complete even when AI makes no tool calls', async () => {
    const { ws, send } = setup({ toolCalls: [] });

    await send({
      type: 'prompt',
      text: 'just chatting',
      provider: 'fake',
      model: 'fake-model',
    });

    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeDefined();
  });

  it('sends provider-error (not prompt-complete) when prompt handler throws', async () => {
    const { ws, broadcast, deps } = setup();

    deps.onPrompt = (async () => { throw new Error('API rate limited'); }) as typeof handlePrompt;

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'prompt',
      text: 'fail',
      provider: 'fake',
      model: 'fake-model',
    }, deps);

    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeUndefined();

    const error = broadcast.mock.calls.find(
      ([m]) => (m as WsMessage).type === 'provider-error',
    );
    expect(error).toBeDefined();
    expect((error![0] as WsProviderError).error).toContain('API rate limited');
  });

  it('multi-turn: second prompt gets prompt-complete after first', async () => {
    const { ws, send, promptDeps } = setup({
      toolCalls: [{ toolName: 'explain', params: { content: 'TCP is a transport protocol.' } }],
    });

    // First prompt: AI adds an explanation
    await send({
      type: 'prompt',
      text: 'teach me TCP',
      provider: 'fake',
      model: 'fake-model',
    });

    expect(ws.sent.filter(m => m.type === 'prompt-complete')).toHaveLength(1);

    // Second prompt: swap provider to one that replaces explanation
    promptDeps.getProvider = (id: string) =>
      id === 'fake'
        ? fakeProvider([{ toolName: 'explain', params: { content: 'TCP uses a three-way handshake.' } }])
        : undefined;

    await send({
      type: 'prompt',
      text: 'tell me more',
      provider: 'fake',
      model: 'fake-model',
    });

    expect(ws.sent.filter(m => m.type === 'prompt-complete')).toHaveLength(2);
  });

  it('no provider/model selected returns silently (REPL mode)', async () => {
    const { ws, send, broadcast } = setup();

    await send({
      type: 'prompt',
      text: 'hello',
    });

    expect(ws.sent).toHaveLength(0);
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('no active chat sends provider-error', async () => {
    const { ws, state, send } = setup();
    state.activeChatId = null;

    await send({
      type: 'prompt',
      text: 'hello',
      provider: 'fake',
      model: 'fake-model',
    });

    const error = ws.sent.find(m => m.type === 'provider-error');
    expect(error).toBeDefined();
    expect(error!.error).toContain('No active chat');
  });

  it('broadcasts tool-progress for each tool call during prompt', async () => {
    const { broadcast, send } = setup({
      toolCalls: [
        { toolName: 'show_visual', params: { type: 'mermaid', content: 'graph LR\n  A-->B' } },
        { toolName: 'explain', params: { content: 'Hello' } },
      ],
    });

    await send({
      type: 'prompt',
      text: 'teach me',
      provider: 'fake',
      model: 'fake-model',
    });

    const progressCalls = broadcast.mock.calls
      .map(([m]) => m as WsMessage)
      .filter(m => m.type === 'tool-progress');

    // planning + thinking + 2 tool calls = 4 progress messages
    expect(progressCalls).toHaveLength(4);
    expect(progressCalls[0]).toMatchObject({ type: 'tool-progress', toolName: 'planning', step: 0 });
    expect(progressCalls[1]).toMatchObject({ type: 'tool-progress', toolName: 'thinking', step: 0 });
    expect(progressCalls[2]).toMatchObject({ type: 'tool-progress', toolName: 'show_visual', step: 1 });
    expect(progressCalls[3]).toMatchObject({ type: 'tool-progress', toolName: 'explain', step: 2 });
  });

  it('broadcasts tool-progress thinking even with zero tool calls', async () => {
    const { broadcast, send } = setup({ toolCalls: [] });

    await send({
      type: 'prompt',
      text: 'just chatting',
      provider: 'fake',
      model: 'fake-model',
    });

    const progressCalls = broadcast.mock.calls
      .map(([m]) => m as WsMessage)
      .filter(m => m.type === 'tool-progress');

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toMatchObject({ toolName: 'planning', step: 0 });
    expect(progressCalls[1]).toMatchObject({ toolName: 'thinking', step: 0 });
  });
});

describe('ws-handlers other routes', () => {
  // --- new-chat ---

  it('new-chat creates chat, switches, broadcasts chat-list, sends session-init', async () => {
    const { ws, send, deps, broadcast } = setup();

    await send({ type: 'new-chat' });

    expect(deps.switchToChat).toHaveBeenCalled();

    const chatListBroadcast = broadcast.mock.calls.find(
      ([m]) => (m as WsMessage).type === 'chat-list',
    );
    expect(chatListBroadcast).toBeDefined();

    const sessionInit = ws.sent.find(m => m.type === 'session-init');
    expect(sessionInit).toBeDefined();
  });

  // --- switch-chat ---

  it('switch-chat with valid id calls switchToChat and broadcasts', async () => {
    const { send, deps, broadcast } = setup();

    await send({ type: 'switch-chat', chatId: 'c1' });

    expect(deps.switchToChat).toHaveBeenCalledWith('c1');
    expect(broadcast).toHaveBeenCalled();
  });

  it('switch-chat with unknown id early-returns without switching', async () => {
    const { send, deps, broadcast } = setup();

    await send({ type: 'switch-chat', chatId: 'unknown' });

    expect(deps.switchToChat).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  // --- delete-chat ---

  it('delete-chat of active chat calls deleteChat and broadcasts session state', async () => {
    const { send, deps, state, broadcast } = setup();
    state.activeChatId = 'c1';

    const deleteSpy = vi.spyOn(deps.chatStore, 'deleteChat');
    await send({ type: 'delete-chat', chatId: 'c1' });

    expect(deleteSpy).toHaveBeenCalledWith('c1');
    // ensureActiveChat + broadcastSessionState results in session-init broadcast
    const sessionBroadcast = broadcast.mock.calls.find(
      ([m]) => (m as WsMessage).type === 'session-init',
    );
    expect(sessionBroadcast).toBeDefined();
  });

  it('delete-chat of non-active chat broadcasts chat-list', async () => {
    const { send, deps, state, broadcast } = setup();
    state.activeChatId = 'other';

    const deleteSpy = vi.spyOn(deps.chatStore, 'deleteChat');
    await send({ type: 'delete-chat', chatId: 'c1' });

    expect(deleteSpy).toHaveBeenCalledWith('c1');
    const chatListBroadcast = broadcast.mock.calls.find(
      ([m]) => (m as WsMessage).type === 'chat-list',
    );
    expect(chatListBroadcast).toBeDefined();
    // Should NOT broadcast full session-init
    const sessionBroadcast = broadcast.mock.calls.find(
      ([m]) => (m as WsMessage).type === 'session-init',
    );
    expect(sessionBroadcast).toBeUndefined();
  });

  // --- select-version ---

  it('select-version with no version store early-returns', async () => {
    const { ws, send, state } = setup();
    state.activeVersionStore = null;

    await send({ type: 'select-version', version: 1 });

    const versionChange = ws.sent.find(m => m.type === 'version-change');
    expect(versionChange).toBeUndefined();
  });

  it('select-version with store sends version-change', async () => {
    const { ws, send, store } = setup();
    store.getVersion = async () => MINIMAL_DOC;
    store.listVersions = async () => [buildVersionMeta()];

    await send({ type: 'select-version', version: 1 });

    const versionChange = ws.sent.find(m => m.type === 'version-change');
    expect(versionChange).toBeDefined();
    expect(versionChange).toMatchObject({
      type: 'version-change',
      version: 1,
    });
  });

  // --- preflight ---

  it('preflight with missing provider sends ok:false', async () => {
    const { ws, deps } = setup();

    await routeMessage(ws as unknown as import('ws').WebSocket,
      { type: 'preflight', provider: 'unknown', model: 'm1' },
      { ...deps, getProvider: () => undefined },
    );

    const result = ws.sent.find(m => m.type === 'preflight-result');
    expect(result).toBeDefined();
    expect(result).toMatchObject({ ok: false });
    expect((result as { error?: string }).error).toContain('not found');
  });

  it('preflight success sends ok:true', async () => {
    const { ws, deps, provider } = setup();

    await routeMessage(ws as unknown as import('ws').WebSocket,
      { type: 'preflight', provider: 'fake', model: 'fake-model' },
      { ...deps, getProvider: (id: string) => id === 'fake' ? provider : undefined },
    );

    const result = ws.sent.find(m => m.type === 'preflight-result');
    expect(result).toBeDefined();
    expect(result).toMatchObject({ ok: true });
  });

  it('preflight error sends ok:false with error message', async () => {
    const { ws, deps } = setup();
    const badProvider = fakeProvider();
    badProvider.preflight = async () => { throw new Error('Connection refused'); };

    await routeMessage(ws as unknown as import('ws').WebSocket,
      { type: 'preflight', provider: 'bad', model: 'm1' },
      { ...deps, getProvider: () => badProvider },
    );

    const result = ws.sent.find(m => m.type === 'preflight-result');
    expect(result).toBeDefined();
    expect(result).toMatchObject({ ok: false });
    expect((result as { error?: string }).error).toContain('Connection refused');
  });

  // --- get-providers ---

  it('get-providers sends provider-list', async () => {
    const { ws, deps } = setup();
    const providers = [{ id: 'p1', name: 'Provider 1', models: [] }];

    await routeMessage(ws as unknown as import('ws').WebSocket,
      { type: 'get-providers' },
      { ...deps, getProviders: () => providers },
    );

    const msg = ws.sent.find(m => m.type === 'provider-list');
    expect(msg).toBeDefined();
    expect(msg).toMatchObject({
      type: 'provider-list',
      providers,
    });
  });
});
