import { describe, it, expect, vi } from 'vitest';
import { handlePrompt } from '../prompt-handler.js';
import { createDocumentService } from '../document-service.js';
import {
  MINIMAL_DOC,
  fakeFileIO,
  fakeAgent,
  fakeContextCompiler,
  spyVersionStore,
} from '../../test/helpers.js';

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
  const provider = fakeAgent(opts.toolCalls ?? [], {
    type: opts.providerType ?? 'api',
  });

  const deps = {
    documentService,
    contextCompiler: fakeContextCompiler(),
    getProvider: (id: string) => id === 'fake' ? provider : undefined,
  };

  return { io, documentService, store, provider, deps };
}

/**
 * Integration tests for handlePrompt — the orchestration layer that wires
 * provider tool calls → DocumentService → version store. All side effects
 * (filesystem, AI provider, context compilation) are replaced with in-memory
 * fakes so we test the pipeline without CLI/API invocations.
 */
describe('handlePrompt integration', () => {
  it('unknown provider id throws', async () => {
    const { deps, store } = setup();
    await expect(
      handlePrompt({
        text: 'hello',
        providerId: 'does-not-exist',
        modelId: 'any',
        chatDir: '/chat',
        latestDocument: null,
        versionStore: store,
      }, deps),
    ).rejects.toThrow('Unknown provider');
  });

  it('API mode: single tool call mutates document', async () => {
    const { deps, store } = setup({
      toolCalls: [{ toolName: 'explain', params: { content: 'TCP is a transport protocol.' } }],
    });

    const result = await handlePrompt({
      text: 'Explain TCP',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    expect(result.updatedDocument.sections[0].explanation).toBe('TCP is a transport protocol.');
  });

  it('API mode: multi-tool sequence composes correctly', async () => {
    const { deps, store } = setup({
      toolCalls: [
        { toolName: 'new_section', params: { title: 'TCP Basics' } },
        { toolName: 'set_active', params: { section: 'tcp-basics' } },
        { toolName: 'show_visual', params: { type: 'mermaid', content: 'graph TD\n  SYN-->ACK' } },
        { toolName: 'explain', params: { content: 'TCP uses a three-way handshake.' } },
        { toolName: 'challenge', params: { question: 'What are the three steps?' } },
      ],
    });

    const result = await handlePrompt({
      text: 'Teach me TCP',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    const doc = result.updatedDocument;
    const tcp = doc.sections.find(s => s.id === 'tcp-basics');
    expect(tcp).toBeDefined();
    expect(tcp!.canvas?.type).toBe('mermaid');
    expect(tcp!.explanation).toContain('three-way handshake');
    expect(tcp!.checks).toHaveLength(1);
  });

  it('API mode: no tool calls → no version created', async () => {
    const { deps, store } = setup({ toolCalls: [] });

    await handlePrompt({
      text: 'just chatting',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    expect(store.createVersion).not.toHaveBeenCalled();
  });

  it('API mode: tool calls bump version → version store receives snapshot', async () => {
    const { deps, store } = setup({
      toolCalls: [{ toolName: 'explain', params: { content: 'New content' } }],
    });

    await handlePrompt({
      text: 'update',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    expect(store.createVersion).toHaveBeenCalledTimes(1);
    const [content, meta] = store.createVersion.mock.calls[0];
    expect(content).toContain('New content');
    expect(meta.prompt).toBe('update');
    expect(meta.source).toBe('ai');
  });

  it('CLI mode: content change triggers version creation', async () => {
    // CLI provider mutates the file directly. We simulate this by having
    // the fake provider write different content during complete().
    const io = fakeFileIO(new Map([
      ['/chat/current.md', MINIMAL_DOC],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    // Fake CLI provider that writes new content to the file during complete()
    const cliProvider = fakeAgent([], { type: 'cli', id: 'cli-fake' });
    cliProvider.run = async () => {
      // Simulate CLI editing the file directly (as codex exec / claude --print would)
      const updatedContent = MINIMAL_DOC.replace(
        'This is the introduction.',
        'CLI wrote this new explanation.',
      );
      io.files.set('/chat/current.md', updatedContent);
    };

    const deps = {
      documentService,
      contextCompiler: fakeContextCompiler(),
      getProvider: (id: string) => id === 'cli-fake' ? cliProvider : undefined,
    };

    await handlePrompt({
      text: 'update via CLI',
      providerId: 'cli-fake',
      modelId: 'any',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    expect(store.createVersion).toHaveBeenCalledTimes(1);
  });

  it('CLI mode: identical content → no version created', async () => {
    const io = fakeFileIO(new Map([
      ['/chat/current.md', MINIMAL_DOC],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    // CLI provider that does nothing (content unchanged)
    const cliProvider = fakeAgent([], { type: 'cli', id: 'cli-noop' });
    cliProvider.run = async () => {};

    const deps = {
      documentService,
      contextCompiler: fakeContextCompiler(),
      getProvider: (id: string) => id === 'cli-noop' ? cliProvider : undefined,
    };

    await handlePrompt({
      text: 'nothing happens',
      providerId: 'cli-noop',
      modelId: 'any',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps);

    expect(store.createVersion).not.toHaveBeenCalled();
  });
});

describe('handlePrompt onProgress', () => {
  it('API mode: emits thinking then each tool call with incrementing step', async () => {
    const onProgress = vi.fn();
    const { deps, store } = setup({
      toolCalls: [
        { toolName: 'show_visual', params: { type: 'mermaid', content: 'graph LR\n  A-->B' } },
        { toolName: 'explain', params: { content: 'An explanation.' } },
        { toolName: 'challenge', params: { question: 'Why?' } },
      ],
    });

    await handlePrompt({
      text: 'teach me',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
      onProgress,
    }, deps);

    expect(onProgress).toHaveBeenCalledTimes(5); // planning + thinking + 3 tools
    expect(onProgress.mock.calls[0]).toEqual(['planning', 0]);
    expect(onProgress.mock.calls[1]).toEqual(['thinking', 0]);
    expect(onProgress.mock.calls[2]).toEqual(['show_visual', 1]);
    expect(onProgress.mock.calls[3]).toEqual(['explain', 2]);
    expect(onProgress.mock.calls[4]).toEqual(['challenge', 3]);
  });

  it('API mode: zero tool calls emits planning + thinking', async () => {
    const onProgress = vi.fn();
    const { deps, store } = setup({ toolCalls: [] });

    await handlePrompt({
      text: 'no tools',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
      onProgress,
    }, deps);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]).toEqual(['planning', 0]);
    expect(onProgress.mock.calls[1]).toEqual(['thinking', 0]);
  });

  it('CLI mode: emits planning + thinking (no per-tool progress)', async () => {
    const onProgress = vi.fn();
    const io = fakeFileIO(new Map([
      ['/chat/current.md', MINIMAL_DOC],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();
    const cliProvider = fakeAgent([], { type: 'cli', id: 'fake' });
    cliProvider.run = async () => {};

    const deps = {
      documentService,
      contextCompiler: fakeContextCompiler(),
      getProvider: (id: string) => id === 'fake' ? cliProvider : undefined,
    };

    await handlePrompt({
      text: 'cli prompt',
      providerId: 'fake',
      modelId: 'any',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
      onProgress,
    }, deps);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]).toEqual(['planning', 0]);
    expect(onProgress.mock.calls[1]).toEqual(['thinking', 0]);
  });

  it('onProgress is optional — works without it', async () => {
    const { deps, store } = setup({
      toolCalls: [{ toolName: 'explain', params: { content: 'works' } }],
    });

    // Should not throw when onProgress is omitted
    await expect(handlePrompt({
      text: 'no callback',
      providerId: 'fake',
      modelId: 'fake-model',
      chatDir: '/chat',
      latestDocument: null,
      versionStore: store,
    }, deps)).resolves.toBeDefined();
  });
});
