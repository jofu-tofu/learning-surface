import type {
  CanvasContent,
  Check,
  LearningDocument,
  Section,
  SurfaceContext,
  VersionMeta,
} from '../shared/types.js';

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
    status: 'active',
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
    timestamp: '2026-03-11T00:00:00Z',
    source: 'ai',
    ...overrides,
  };
}

export function buildSurfaceContext(overrides: Partial<SurfaceContext> = {}): SurfaceContext {
  return {
    session: {
      topic: 'tcp',
      version: 1,
      activeSection: 'test-section',
    },
    surface: {
      canvas: null,
      explanation: null,
      checks: [],
      followups: [],
    },
    sections: [{ title: 'Test Section', status: 'active' }],
    promptHistory: [],
    ...overrides,
  };
}

// === Fixture Markdown Strings ===

export const MINIMAL_DOC = `---
version: 1
active_section: introduction
---

## Introduction
<!-- status: active -->

### explanation
This is the introduction.
`;

export const FULL_DOC = `---
version: 3
active_section: the-three-way-handshake
---

## What is TCP?
<!-- status: completed -->

### canvas: mermaid
graph LR
  A[Application] --> B[TCP] --> C[IP] --> D[Network]

### explanation
TCP is a connection-oriented protocol that ensures reliable data delivery.

## The Three-Way Handshake
<!-- status: active -->

### canvas: mermaid
sequenceDiagram
  Client->>Server: SYN
  Server->>Client: SYN-ACK
  Client->>Server: ACK

### explanation
The three-way handshake establishes a reliable connection.

### check: c1
Why three steps instead of one?
<!-- status: unanswered -->

### followups
- What is a SYN packet?
- TCP vs UDP
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

export const KATEX_DOC = `---
version: 1
active_section: math
---

## Math

### canvas: katex
E = mc^2

### explanation
Einstein's famous equation.
`;

export const CODE_DOC = `---
version: 1
active_section: code-example
---

## Code Example

### canvas: code
\`\`\`typescript
function hello(): string {
  return 'world';
}
\`\`\`

### explanation
A simple TypeScript function.
`;

// === Helpers ===

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
