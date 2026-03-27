import { describe, it, expect, vi } from 'vitest';
import { routeMessage, type HandlerDeps } from '../ws-handlers.js';
import { handlePrompt } from '../prompt-handler.js';
import { createDocumentService } from '../document-service.js';
import type { ChatStore } from '../chat-store.js';
import type { SessionBus } from '../session-bus.js';
import type { ClientMessage, WsMessage, WsProviderError } from '../../shared/messages.js';
import {
  MINIMAL_DOC,
  fakeFileIO,
  fakeAgent,
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
    async touchChat() {},
    async deleteChat() {},
    getChatDir: () => chatDir,
    async save() {},
  };
}

// === Fake SessionBus ===

function fakeSessionBus(overrides: Partial<SessionBus> = {}): SessionBus {
  const store = spyVersionStore();
  return {
    activeChatId: 'c1',
    activeVersionStore: store,
    latestDocument: null,
    lastProvider: undefined,
    lastModel: undefined,
    switchToChat: vi.fn(async () => {}),
    ensureActiveChat: vi.fn(async () => {}),
    documentChanged: vi.fn(async () => {}),
    completedWithDocument: vi.fn(async () => {}),
    chatListChanged: vi.fn(() => {}),
    broadcastFullState: vi.fn(async () => {}),
    toolProgress: vi.fn(() => {}),
    providerError: vi.fn(() => {}),
    buildSessionInit: vi.fn(async () => ({
      type: 'session-init' as const,
      sessionDir: '/chat',
      versions: [],
      chats: [],
      activeChatId: 'c1',
    })),
    ...overrides,
  };
}

// === Test helpers ===

function setup(opts: {
  toolCalls?: Array<{ toolName: string; params: Record<string, unknown> }>;
  providerType?: 'api' | 'cli';
  initialDoc?: string;
} = {}) {
  const io = fakeFileIO(new Map([
    ['/chat/current.surface', opts.initialDoc ?? MINIMAL_DOC],
  ]));
  const documentService = createDocumentService(io);
  const store = spyVersionStore();
  const provider = fakeAgent(opts.toolCalls ?? [], {
    type: opts.providerType ?? 'api',
  });

  const bus = fakeSessionBus({
    activeVersionStore: store,
  });

  const ws = fakeWs();

  // Wrap handlePrompt with test deps so the fake provider/documentService are used
  const promptDeps = {
    documentService: documentService,
    contextCompiler: fakeContextCompiler(),
    getProvider: (id: string) => id === 'fake' ? provider : undefined,
  };

  const deps: HandlerDeps = {
    bus,
    chatStore: fakeChatStore(),
    documentService,
    onPrompt: ((req: Parameters<typeof handlePrompt>[0]) =>
      handlePrompt(req, promptDeps)) as typeof handlePrompt,
  };

  async function send(msg: ClientMessage) {
    await routeMessage(ws as unknown as import('ws').WebSocket, msg, deps);
  }

  return { ws, bus, deps, store, provider, promptDeps, send };
}

describe('ws-handlers prompt flow', () => {
  it('sends prompt-complete after successful prompt', async () => {
    const { ws, send } = setup({
      toolCalls: [{ toolName: 'design_surface', params: { summary: 'Explaining something', blocks: [{ type: 'text', content: 'Hello' }] } }],
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

  it('calls bus.completedWithDocument after successful prompt', async () => {
    const { bus, send } = setup({
      toolCalls: [{ toolName: 'design_surface', params: { summary: 'Test', blocks: [{ type: 'text', content: 'Hello' }] } }],
    });

    await send({
      type: 'prompt',
      text: 'explain something',
      provider: 'fake',
      model: 'fake-model',
    });

    expect(bus.completedWithDocument).toHaveBeenCalledTimes(1);
  });

  it('calls bus.toolProgress for each tool call during prompt', async () => {
    const { bus, send } = setup({
      toolCalls: [
        { toolName: 'design_surface', params: { summary: 'Teaching intro', canvases: [{ id: 'v', type: 'code', content: 'graph LR' }] } },
        { toolName: 'design_surface', params: { summary: 'Teaching intro', blocks: [{ type: 'text', content: 'Hello' }] } },
      ],
    });

    await send({
      type: 'prompt',
      text: 'teach me',
      provider: 'fake',
      model: 'fake-model',
    });

    // thinking + 2 tool calls = 3 progress calls
    expect(bus.toolProgress).toHaveBeenCalledTimes(3);
    expect(bus.toolProgress).toHaveBeenCalledWith('thinking', 0);
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

  it('calls bus.providerError (not prompt-complete) when prompt handler throws', async () => {
    const { ws, bus, deps } = setup();

    deps.onPrompt = (async () => { throw new Error('API rate limited'); }) as typeof handlePrompt;

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'prompt',
      text: 'fail',
      provider: 'fake',
      model: 'fake-model',
    }, deps);

    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeUndefined();

    expect(bus.providerError).toHaveBeenCalledWith('API rate limited');
  });

  it('multi-turn: second prompt gets prompt-complete after first', async () => {
    const { ws, send, promptDeps } = setup({
      toolCalls: [{ toolName: 'design_surface', params: { summary: 'TCP transport protocol', blocks: [{ type: 'text', content: 'TCP is a transport protocol.' }] } }],
    });

    // First prompt: AI adds text
    await send({
      type: 'prompt',
      text: 'teach me TCP',
      provider: 'fake',
      model: 'fake-model',
    });

    expect(ws.sent.filter(m => m.type === 'prompt-complete')).toHaveLength(1);

    // Second prompt: swap provider to one that replaces blocks
    promptDeps.getProvider = (id: string) =>
      id === 'fake'
        ? fakeAgent([{ toolName: 'design_surface', params: { summary: 'TCP three-way handshake', blocks: [{ type: 'text', content: 'TCP uses a three-way handshake.' }] } }])
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
    const { ws, send, bus } = setup();

    await send({
      type: 'prompt',
      text: 'hello',
    });

    expect(ws.sent).toHaveLength(0);
    expect(bus.completedWithDocument).not.toHaveBeenCalled();
    expect(bus.toolProgress).not.toHaveBeenCalled();
  });

  it('no active chat sends provider-error', async () => {
    const { ws, deps } = setup();
    (deps.bus as { activeChatId: string | null }).activeChatId = null;

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'prompt',
      text: 'hello',
      provider: 'fake',
      model: 'fake-model',
    }, deps);

    const error = ws.sent.find(m => m.type === 'provider-error');
    expect(error).toBeDefined();
    expect((error as WsProviderError).error).toContain('No active chat');
  });

  it('broadcasts tool-progress thinking even with zero tool calls', async () => {
    const { bus, send } = setup({ toolCalls: [] });

    await send({
      type: 'prompt',
      text: 'just chatting',
      provider: 'fake',
      model: 'fake-model',
    });

    expect(bus.toolProgress).toHaveBeenCalledTimes(1);
    expect(bus.toolProgress).toHaveBeenCalledWith('thinking', 0);
  });
});

describe('ws-handlers other routes', () => {
  // --- new-chat ---

  it('new-chat creates chat, switches via bus, sends session-init', async () => {
    const { ws, send, bus } = setup();

    await send({ type: 'new-chat' });

    expect(bus.switchToChat).toHaveBeenCalled();
    expect(bus.chatListChanged).toHaveBeenCalled();

    const sessionInit = ws.sent.find(m => m.type === 'session-init');
    expect(sessionInit).toBeDefined();
  });

  // --- new-chat-with-prompt ---

  it('new-chat-with-prompt must NOT send session-init (preserves isProcessing on client)', async () => {
    const { ws, send, bus } = setup({
      toolCalls: [{ toolName: 'design_surface', params: { summary: 'Trees', blocks: [{ type: 'text', content: 'A tree is...' }] } }],
    });

    await send({
      type: 'new-chat-with-prompt',
      text: 'explain binary trees',
      provider: 'fake',
      model: 'fake-model',
    });

    // Must NOT send session-init to the requesting client (that resets isProcessing)
    const sessionInit = ws.sent.find(m => m.type === 'session-init');
    expect(sessionInit).toBeUndefined();
  });

  it('new-chat-with-prompt creates chat, broadcasts chat-list, and processes prompt', async () => {
    const { ws, send, bus } = setup({
      toolCalls: [{ toolName: 'design_surface', params: { summary: 'Trees', blocks: [{ type: 'text', content: 'A tree is...' }] } }],
    });

    await send({
      type: 'new-chat-with-prompt',
      text: 'explain binary trees',
      provider: 'fake',
      model: 'fake-model',
    });

    // Creates and switches to a new chat
    expect(bus.switchToChat).toHaveBeenCalled();
    expect(bus.chatListChanged).toHaveBeenCalled();

    // Prompt is processed: prompt-complete is sent
    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeDefined();
  });

  // --- switch-chat ---

  it('switch-chat with valid id calls bus.switchToChat and broadcasts full state', async () => {
    const { send, bus } = setup();

    await send({ type: 'switch-chat', chatId: 'c1' });

    expect(bus.switchToChat).toHaveBeenCalledWith('c1');
    expect(bus.broadcastFullState).toHaveBeenCalled();
  });

  it('switch-chat with unknown id early-returns without switching', async () => {
    const { send, bus } = setup();

    await send({ type: 'switch-chat', chatId: 'unknown' });

    expect(bus.switchToChat).not.toHaveBeenCalled();
    expect(bus.broadcastFullState).not.toHaveBeenCalled();
  });

  // --- delete-chat ---

  it('delete-chat of active chat calls ensureActiveChat and broadcasts full state', async () => {
    const { send, deps, bus } = setup();

    const deleteSpy = vi.spyOn(deps.chatStore, 'deleteChat');
    await send({ type: 'delete-chat', chatId: 'c1' });

    expect(deleteSpy).toHaveBeenCalledWith('c1');
    expect(bus.ensureActiveChat).toHaveBeenCalled();
    expect(bus.broadcastFullState).toHaveBeenCalled();
  });

  it('delete-chat of non-active chat broadcasts chat-list only', async () => {
    const { send, deps, bus } = setup();
    (deps.bus as { activeChatId: string | null }).activeChatId = 'other';

    const deleteSpy = vi.spyOn(deps.chatStore, 'deleteChat');
    await send({ type: 'delete-chat', chatId: 'c1' });

    expect(deleteSpy).toHaveBeenCalledWith('c1');
    expect(bus.chatListChanged).toHaveBeenCalled();
    expect(bus.broadcastFullState).not.toHaveBeenCalled();
  });

  // --- delete-chats (batch) ---

  it('delete-chats with empty array is a no-op', async () => {
    const { send, deps, bus } = setup();

    const deleteSpy = vi.spyOn(deps.chatStore, 'deleteChat');
    await send({ type: 'delete-chats', chatIds: [] });

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(bus.chatListChanged).not.toHaveBeenCalled();
  });

  it('delete-chats including active chat calls ensureActiveChat', async () => {
    const { send, bus } = setup();

    await send({ type: 'delete-chats', chatIds: ['c1'] });

    expect(bus.ensureActiveChat).toHaveBeenCalled();
    expect(bus.broadcastFullState).toHaveBeenCalled();
  });

  it('delete-chats of non-active chats broadcasts chat-list', async () => {
    const { send, deps, bus } = setup();
    (deps.bus as { activeChatId: string | null }).activeChatId = 'other';

    await send({ type: 'delete-chats', chatIds: ['c1'] });

    expect(bus.chatListChanged).toHaveBeenCalled();
    expect(bus.broadcastFullState).not.toHaveBeenCalled();
  });

  // --- rename-chat ---

  it('rename-chat with valid id updates title and broadcasts via bus', async () => {
    const { send, deps, bus } = setup();

    const updateTitleSpy = vi.spyOn(deps.chatStore, 'updateChatTitle');
    await send({ type: 'rename-chat', chatId: 'c1', title: 'Renamed Chat' });

    expect(updateTitleSpy).toHaveBeenCalledWith('c1', 'Renamed Chat');
    expect(bus.chatListChanged).toHaveBeenCalled();
  });

  it('rename-chat with unknown id early-returns without updating', async () => {
    const { send, deps, bus } = setup();

    const updateTitleSpy = vi.spyOn(deps.chatStore, 'updateChatTitle');
    await send({ type: 'rename-chat', chatId: 'unknown', title: 'Renamed Chat' });

    expect(updateTitleSpy).not.toHaveBeenCalled();
    expect(bus.chatListChanged).not.toHaveBeenCalled();
  });

  // --- select-version ---

  it('select-version with no version store early-returns', async () => {
    const { ws, send, deps } = setup();
    (deps.bus as { activeVersionStore: null }).activeVersionStore = null;

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
    const badProvider = fakeAgent();
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

describe('ws-handlers submit-responses', () => {
  /** Build a doc with interactive blocks. */
  function interactiveDoc() {
    return JSON.stringify({
      version: 2,
      canvases: [],
      blocks: [
        { id: 'b1', type: 'interactive', prompt: 'Who sends the next packet?', response: null },
        { id: 'b2', type: 'interactive', prompt: 'The flag is ___', response: null },
        { id: 'b3', type: 'text', content: 'Some context.' },
      ],
    });
  }

  it('writes learner responses into matching interactive blocks', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', interactiveDoc()],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    const bus = fakeSessionBus({
      activeChatId: 'c1',
      activeVersionStore: store,
    });

    const ws = fakeWs();

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'submit-responses',
      responses: { b1: 'Client', b2: 'ACK' },
    }, {
      bus,
      chatStore: fakeChatStore(),
      documentService,
    });

    // Read the doc that was written to disk
    const raw = io.files.get('/chat/current.surface')!;
    const doc = JSON.parse(raw);

    // Responses should be filled
    expect(doc.blocks[0].response).toBe('Client');
    expect(doc.blocks[1].response).toBe('ACK');
    // Non-interactive block untouched
    expect(doc.blocks[2].type).toBe('text');
  });

  it('sends prompt-complete when auto-trigger cannot fire (no lastProvider)', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', interactiveDoc()],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    const bus = fakeSessionBus({
      activeChatId: 'c1',
      activeVersionStore: store,
    });

    const ws = fakeWs();

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'submit-responses',
      responses: { b1: 'Client', b2: 'ACK' },
    }, {
      bus,
      chatStore: fakeChatStore(),
      documentService,
    });

    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeDefined();
  });

  it('auto-triggers AI feedback when lastProvider and lastModel are set', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', interactiveDoc()],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();
    const provider = fakeAgent([{
      toolName: 'design_surface',
      params: {
        summary: 'Feedback on answers',
        blocks: [
          { type: 'feedback', targetBlockId: 'b1', correct: true, content: 'Correct!' },
          { type: 'text', content: 'The client completes the handshake with an ACK.' },
        ],
      },
    }]);

    const bus = fakeSessionBus({
      activeChatId: 'c1',
      activeVersionStore: store,
      lastProvider: 'fake',
      lastModel: 'fake-model',
    });

    const ws = fakeWs();

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'submit-responses',
      responses: { b1: 'Client', b2: 'ACK' },
    }, {
      bus,
      chatStore: fakeChatStore(),
      documentService,
      getProvider: (id: string) => id === 'fake' ? provider : undefined,
      onPrompt: ((req: Parameters<typeof handlePrompt>[0]) =>
        handlePrompt(req, {
          documentService,
          contextCompiler: fakeContextCompiler(),
          getProvider: (id: string) => id === 'fake' ? provider : undefined,
        })) as typeof handlePrompt,
    });

    // prompt-complete should be sent after the auto-triggered feedback
    const complete = ws.sent.find(m => m.type === 'prompt-complete');
    expect(complete).toBeDefined();

    // The doc on disk should now have feedback content
    const raw = io.files.get('/chat/current.surface')!;
    const doc = JSON.parse(raw);
    const feedbackBlock = doc.blocks.find((b: { type: string }) => b.type === 'feedback');
    expect(feedbackBlock).toBeDefined();
    expect(feedbackBlock.content).toBe('Correct!');
  });

  it('creates version with source: learner', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', interactiveDoc()],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    const bus = fakeSessionBus({
      activeChatId: 'c1',
      activeVersionStore: store,
    });

    const ws = fakeWs();

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'submit-responses',
      responses: { b1: 'Client' },
    }, {
      bus,
      chatStore: fakeChatStore(),
      documentService,
    });

    expect(store.createVersion).toHaveBeenCalledTimes(1);
    const meta = store.createVersion.mock.calls[0][1];
    expect(meta.source).toBe('learner');
    expect(meta.changedPanes).toContain('blocks');
  });

  it('calls bus.completedWithDocument after submitting responses', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', interactiveDoc()],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    const bus = fakeSessionBus({
      activeChatId: 'c1',
      activeVersionStore: store,
    });

    const ws = fakeWs();

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'submit-responses',
      responses: { b1: 'Client' },
    }, {
      bus,
      chatStore: fakeChatStore(),
      documentService,
    });

    expect(bus.completedWithDocument).toHaveBeenCalledTimes(1);
  });
});
