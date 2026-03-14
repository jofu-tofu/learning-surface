import { vi } from 'vitest';
import type {
  CanvasContent,
  Check,
  LearningDocument,
  Section,
  VersionMeta,
  VersionStore,
} from '../shared/types.js';
export type { VersionStore };
import { slugify } from '../shared/slugify.js';
import { serialize } from '../server/markdown.js';

// === Builders ===

export function buildCanvasContent(overrides: Partial<CanvasContent> = {}): CanvasContent {
  return {
    type: 'mermaid',
    content: 'graph LR\n  A --> B',
    ...overrides,
  };
}

export function buildCheck(overrides: Partial<Check> = {}): Check {
  return {
    id: 'c1',
    question: 'Why does this work?',
    status: 'unanswered',
    ...overrides,
  };
}

export function buildSection(overrides: Partial<Section> = {}): Section {
  const title = overrides.title ?? 'Test Section';
  return {
    id: slugify(title),
    title,
    ...overrides,
  };
}

export function buildDocument(overrides: Partial<LearningDocument> = {}): LearningDocument {
  const sections = overrides.sections ?? [buildSection()];
  return {
    version: 1,
    activeSection: sections[0].id,
    sections,
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

// === Fixture Markdown Strings ===

// Generated from builders — stays in sync with format changes automatically.
export const MINIMAL_DOC = serialize(buildDocument({
  sections: [buildSection({ title: 'Introduction', explanation: 'This is the introduction.' })],
  activeSection: 'introduction',
}));

// Deliberately malformed — no frontmatter. Must stay as raw string.
export const NO_FRONTMATTER_DOC = `## Introduction

### explanation
Missing frontmatter.
`;

// Generated from builders — empty section with no blocks.
export const EMPTY_SECTION_DOC = serialize(buildDocument({
  sections: [buildSection({ title: 'Empty' })],
  activeSection: 'empty',
}));

// Deliberate edge case — unknown block type. Must stay as raw string.
export const UNKNOWN_BLOCK_DOC = `---
version: 1
active_section: test
---

## Test

### unknown_block
Some content here.

### explanation
Known block.
`;

// Deliberate edge case — duplicate blocks. Must stay as raw string.
export const DUPLICATE_BLOCK_DOC = `---
version: 1
active_section: test
---

## Test

### explanation
First explanation.

### explanation
Second explanation.
`;

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
import type { ContextCompiler } from '../shared/types.js';

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
 * `ask()` returns a configurable response (defaults to empty object).
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
    async ask() { return {}; },
    async run(runRequest) {
      if (runRequest.onToolCall) {
        for (const toolCall of toolCalls) {
          await runRequest.onToolCall(toolCall);
        }
      }
    },
  };
}

/** @deprecated Use fakeAgent() instead. Alias for backwards compatibility. */
export const fakeProvider = fakeAgent;

/** Fake ContextCompiler that returns a minimal SurfaceContext. */
export function fakeContextCompiler(): ContextCompiler {
  const META_KEYS = new Set(['id', 'title', '_unknownBlocks']);
  return {
    async compile(doc) {
      const active = doc.sections.find(section => section.id === doc.activeSection);
      const surface: Record<string, unknown> = {};
      if (active) {
        for (const [key, value] of Object.entries(active)) {
          if (META_KEYS.has(key)) continue;
          surface[key] = value ?? null;
        }
      }
      return {
        session: { topic: 'test', version: doc.version, activeSection: doc.activeSection },
        surface,
        sections: doc.sections.map(section => ({ title: section.title })),
        promptHistory: [],
      };
    },
  };
}


