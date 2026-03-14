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
    ['/chat/current.surface', opts.initialDoc ?? MINIMAL_DOC],
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

  it('API mode: design_surface tool call mutates document', async () => {
    const { deps, store } = setup({
      toolCalls: [{
        toolName: 'design_surface',
        params: { sections: [{ id: 'introduction', explanation: 'TCP is a transport protocol.' }] },
      }],
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
      toolCalls: [{
        toolName: 'design_surface',
        params: { sections: [{ id: 'introduction', explanation: 'New content' }] },
      }],
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
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', MINIMAL_DOC],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

    const cliProvider = fakeAgent([], { type: 'cli', id: 'cli-fake' });
    cliProvider.run = async () => {
      const updatedContent = MINIMAL_DOC.replace(
        'This is the introduction.',
        'CLI wrote this new explanation.',
      );
      io.files.set('/chat/current.surface', updatedContent);
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
      ['/chat/current.surface', MINIMAL_DOC],
    ]));
    const documentService = createDocumentService(io);
    const store = spyVersionStore();

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
        { toolName: 'design_surface', params: { sections: [{ id: 'introduction', canvases: [{ id: 'v', type: 'mermaid', content: 'graph LR\n  A-->B' }] }] } },
        { toolName: 'design_surface', params: { sections: [{ id: 'introduction', explanation: 'An explanation.' }] } },
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

    expect(onProgress).toHaveBeenCalledTimes(3); // thinking + 2 tools
    expect(onProgress.mock.calls[0]).toEqual(['thinking', 0]);
    expect(onProgress.mock.calls[1]).toEqual(['design_surface', 1]);
    expect(onProgress.mock.calls[2]).toEqual(['design_surface', 2]);
  });

  it('API mode: zero tool calls emits only thinking', async () => {
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

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress.mock.calls[0]).toEqual(['thinking', 0]);
  });

  it('CLI mode: emits thinking (no per-tool progress)', async () => {
    const onProgress = vi.fn();
    const io = fakeFileIO(new Map([
      ['/chat/current.surface', MINIMAL_DOC],
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

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress.mock.calls[0]).toEqual(['thinking', 0]);
  });

  it('onProgress is optional — works without it', async () => {
    const { deps, store } = setup({
      toolCalls: [{
        toolName: 'design_surface',
        params: { sections: [{ id: 'introduction', explanation: 'works' }] },
      }],
    });

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
