import { describe, it, expect, vi } from 'vitest';
import { handlePrompt } from '../prompt-handler.js';
import { createDocumentService } from '../document-service.js';
import {
  MINIMAL_DOC,
  fakeFileIO,
  fakeProvider,
  fakeContextCompiler,
  spyVersionStore,
} from '../../test/helpers.js';

/**
 * Integration tests for handlePrompt — the orchestration layer that wires
 * provider tool calls → DocumentService → version store. All side effects
 * (filesystem, AI provider, context compilation) are replaced with in-memory
 * fakes so we test the pipeline without CLI/API invocations.
 */
describe('handlePrompt integration', () => {
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

    const deps = {
      docService,
      contextCompiler: fakeContextCompiler(),
      getProvider: (id: string) => id === 'fake' ? provider : undefined,
    };

    return { io, docService, store, provider, deps };
  }

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
      toolCalls: [{ tool: 'explain', params: { content: 'TCP is a transport protocol.' } }],
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
        { tool: 'new_section', params: { title: 'TCP Basics' } },
        { tool: 'set_active', params: { section: 'tcp-basics' } },
        { tool: 'show_visual', params: { type: 'mermaid', content: 'graph TD\n  SYN-->ACK' } },
        { tool: 'explain', params: { content: 'TCP uses a three-way handshake.' } },
        { tool: 'challenge', params: { question: 'What are the three steps?' } },
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
      toolCalls: [{ tool: 'explain', params: { content: 'New content' } }],
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
    const docService = createDocumentService(io);
    const store = spyVersionStore();

    // Fake CLI provider that writes new content to the file during complete()
    const cliProvider = fakeProvider([], { type: 'cli', id: 'cli-fake' });
    const originalComplete = cliProvider.complete.bind(cliProvider);
    cliProvider.complete = async (opts) => {
      // Simulate CLI editing the file directly (as codex exec / claude --print would)
      const updatedContent = MINIMAL_DOC.replace(
        'This is the introduction.',
        'CLI wrote this new explanation.',
      );
      io.files.set('/chat/current.md', updatedContent);
    };

    const deps = {
      docService,
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
    const docService = createDocumentService(io);
    const store = spyVersionStore();

    // CLI provider that does nothing (content unchanged)
    const cliProvider = fakeProvider([], { type: 'cli', id: 'cli-noop' });
    cliProvider.complete = async () => {};

    const deps = {
      docService,
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
