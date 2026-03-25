import { vi } from 'vitest';
import type { CanvasContent, LearningDocument, Block, TextBlock, InteractiveBlock, FeedbackBlock, DeeperPatternsBlock, SuggestionsBlock } from '../shared/document.js';
import { type VersionMeta } from '../shared/session.js';
import type { VersionStore } from '../server/types.js';
export type { VersionStore };
import type { DesignSurfaceInput } from '../shared/schemas.js';
import { serializeSurface } from '../server/surface-file.js';

// === Builders ===

export function buildCanvasContent(overrides: Partial<CanvasContent> = {}): CanvasContent {
  return {
    id: overrides.id ?? 'default-canvas',
    type: 'diagram',
    content: JSON.stringify({ nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }] }),
    ...overrides,
  };
}

export function buildDocument(overrides: Partial<LearningDocument> = {}): LearningDocument {
  return {
    version: 1,
    canvases: [],
    blocks: [],
    ...overrides,
  };
}

export function buildVersionMeta(overrides: Partial<VersionMeta> = {}): VersionMeta {
  return {
    version: 1,
    prompt: 'Explain TCP',
    summary: null,
    timestamp: '2026-03-11T00:00:00Z',
    source: 'ai',
    ...overrides,
  };
}

// === Block Builders ===

export function buildTextBlock(overrides: Partial<TextBlock> = {}): TextBlock {
  return {
    id: overrides.id ?? 'b1',
    type: 'text',
    content: overrides.content ?? 'Some text content.',
  };
}

export function buildInteractiveBlock(overrides: Partial<InteractiveBlock> = {}): InteractiveBlock {
  return {
    id: overrides.id ?? 'b1',
    type: 'interactive',
    prompt: overrides.prompt ?? 'What do you think happens?',
    response: overrides.response ?? null,
  };
}

export function buildFeedbackBlock(overrides: Partial<FeedbackBlock> = {}): FeedbackBlock {
  return {
    id: overrides.id ?? 'b1',
    type: 'feedback',
    targetBlockId: overrides.targetBlockId ?? 'b1',
    correct: overrides.correct ?? true,
    content: overrides.content ?? 'Good answer!',
  };
}

export function buildDeeperPatternsBlock(overrides: Partial<DeeperPatternsBlock> = {}): DeeperPatternsBlock {
  return {
    id: overrides.id ?? 'b1',
    type: 'deeper-patterns',
    patterns: overrides.patterns ?? [{ pattern: 'Feedback loops', connection: 'This topic uses feedback.' }],
  };
}

export function buildSuggestionsBlock(overrides: Partial<SuggestionsBlock> = {}): SuggestionsBlock {
  return {
    id: overrides.id ?? 'b1',
    type: 'suggestions',
    items: overrides.items ?? ['What about X?', 'Tell me about Y'],
  };
}

// === Fixture .surface Strings ===

// Generated from builders — stays in sync with format changes automatically.
export const MINIMAL_DOC = serializeSurface(buildDocument({
  canvases: [],
  blocks: [{ id: 'b1', type: 'text', content: 'This is the introduction.' }],
}));

// === Test Doubles ===

export function spyVersionStore(): VersionStore & { createVersion: ReturnType<typeof vi.fn> } {
  return {
    async init() {},
    createVersion: vi.fn(async () => 1),
    async getVersion() { return ''; },
    async getCurrentVersion() { return 0; },
    async listVersions() { return []; },
    async getDiff() { return ''; },
  };
}

// --- FakeFileIO: in-memory filesystem for DocumentService tests ---

import type { FileIO } from '../server/document-service.js';
import type { ProviderToolCall, Agent, ProviderConfig } from '../shared/providers.js';
import type { ContextCompiler } from '../server/types.js';

/**
 * In-memory FileIO backed by a Map. No real disk I/O.
 * Seed initial files via the `files` map.
 */
export function fakeFileIO(files: Map<string, string> = new Map()): FileIO & { files: Map<string, string> } {
  return {
    files,
    readFile(path: string) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
    writeFile(path: string, content: string) {
      files.set(path, content);
    },
    exists(path: string) {
      return files.has(path);
    },
  };
}

/**
 * Fake Agent that simulates AI returning a pre-configured sequence of tool calls.
 * `run()` invokes `onToolCall` for each tool call in the sequence.
 */
export function fakeAgent(
  toolCalls: ProviderToolCall[] = [],
  configOverrides: Partial<ProviderConfig> = {},
): Agent {
  const config: ProviderConfig = {
    id: 'fake',
    name: 'Fake',
    models: [{ id: 'fake-model', name: 'Fake Model' }],
    type: 'api',
    ...configOverrides,
  };

  return {
    config,
    async preflight() { return { ok: true }; },
    async run(runRequest) {
      if (runRequest.onToolCall) {
        for (const toolCall of toolCalls) {
          await runRequest.onToolCall(toolCall);
        }
      }
    },
  };
}


/** Fake ContextCompiler that returns a minimal SurfaceContext. */
export function fakeContextCompiler(): ContextCompiler {
  return {
    async compile(doc) {
      return {
        session: { topic: 'test', version: doc.version },
        surface: {
          canvases: doc.canvases,
          blocks: doc.blocks,
        },
        promptHistory: [],
      };
    },
  };
}
