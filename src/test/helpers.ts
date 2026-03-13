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

export const MINIMAL_DOC = `---
version: 1
active_section: introduction
---

## Introduction

### explanation
This is the introduction.
`;

export const NO_FRONTMATTER_DOC = `## Introduction

### explanation
Missing frontmatter.
`;

export const EMPTY_SECTION_DOC = `---
version: 1
active_section: empty
---

## Empty
`;

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

export function stubVersionStore(): VersionStore {
  return {
    async init() {},
    async createVersion() { return 1; },
    async getVersion() { return ''; },
    async getCurrentVersion() { return 0; },
    async listVersions() { return []; },
    async getDiff() { return ''; },
  };
}

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


