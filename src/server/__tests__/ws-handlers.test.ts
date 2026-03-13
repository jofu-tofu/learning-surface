import { describe, it, expect, vi } from 'vitest';
import { routeMessage, type SessionState } from '../ws-handlers.js';
import { handlePrompt } from '../prompt-handler.js';
import { createDocumentService } from '../document-service.js';
import type { ChatStore } from '../chat-store.js';
import type { ClientMessage, WsMessage, WsProviderError } from '../../shared/types.js';
import type { ReplProvider } from '../../shared/providers.js';
import {
  MINIMAL_DOC,
  fakeFileIO,
  fakeProvider,
  fakeContextCompiler,
  spyVersionStore,
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
  toolCalls?: Array<{ tool: string; params: Record<string, unknown> }>;
  providerType?: 'api' | 'cli';
  initialDoc?: string;
} = {}) {
  const io = fakeFileIO(new Map([
    ['/chat/current.md', opts.initialDoc ?? MINIMAL_DOC],
  ]));
  const docService = createDocumentService(io);
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

  // Wrap handlePrompt with test deps so the fake provider/docService are used
  const promptDeps = {
    docService,
    contextCompiler: fakeContextCompiler(),
    getProvider: (id: string) => id === 'fake' ? provider : undefined,
  };

  const deps = {
    state,
    chatStore: fakeChatStore(),
    broadcast,
    switchToChat: vi.fn(),
    docService,
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
      toolCalls: [{ tool: 'explain', params: { content: 'Hello' } }],
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
    const io = fakeFileIO(new Map([
      ['/chat/current.md', MINIMAL_DOC],
    ]));
    const docService = createDocumentService(io);
    const store = spyVersionStore();

    const state: SessionState = {
      activeChatId: 'c1',
      activeVersionStore: store,
      latestDocument: null,
    };

    const broadcast = vi.fn();
    const ws = fakeWs();

    // First prompt: AI adds an explanation
    let currentProvider: ReplProvider = fakeProvider([
      { tool: 'explain', params: { content: 'TCP is a transport protocol.' } },
    ]);

    const promptDeps = {
      docService,
      contextCompiler: fakeContextCompiler(),
      getProvider: (id: string) => id === 'fake' ? currentProvider : undefined,
    };

    const deps = {
      state,
      chatStore: fakeChatStore(),
      broadcast,
      switchToChat: vi.fn(),
      docService,
      onPrompt: ((req: Parameters<typeof handlePrompt>[0]) =>
        handlePrompt(req, promptDeps)) as typeof handlePrompt,
    };

    // First prompt
    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'prompt',
      text: 'teach me TCP',
      provider: 'fake',
      model: 'fake-model',
    }, deps);

    expect(ws.sent.filter(m => m.type === 'prompt-complete')).toHaveLength(1);
    expect(state.latestDocument).not.toBeNull();
    expect(state.latestDocument!.sections[0].explanation).toBe('TCP is a transport protocol.');

    // Second prompt: AI replaces explanation
    currentProvider = fakeProvider([
      { tool: 'explain', params: { content: 'TCP uses a three-way handshake.' } },
    ]);

    await routeMessage(ws as unknown as import('ws').WebSocket, {
      type: 'prompt',
      text: 'tell me more',
      provider: 'fake',
      model: 'fake-model',
    }, deps);

    expect(ws.sent.filter(m => m.type === 'prompt-complete')).toHaveLength(2);
    expect(state.latestDocument!.sections[0].explanation).toContain('three-way handshake');
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
        { tool: 'show_visual', params: { type: 'mermaid', content: 'graph LR\n  A-->B' } },
        { tool: 'explain', params: { content: 'Hello' } },
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

    // thinking + 2 tool calls = 3 progress messages
    expect(progressCalls).toHaveLength(3);
    expect(progressCalls[0]).toMatchObject({ type: 'tool-progress', toolName: 'thinking', step: 0 });
    expect(progressCalls[1]).toMatchObject({ type: 'tool-progress', toolName: 'show_visual', step: 1 });
    expect(progressCalls[2]).toMatchObject({ type: 'tool-progress', toolName: 'explain', step: 2 });
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

    expect(progressCalls).toHaveLength(1);
    expect(progressCalls[0]).toMatchObject({ toolName: 'thinking', step: 0 });
  });
});
