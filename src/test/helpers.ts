import { vi } from 'vitest';
import {
  getActiveSection,
  type CanvasContent,
  type Check,
  type LearningDocument,
  type Section,
  type VersionMeta,
} from '../shared/types.js';
import type { VersionStore } from '../server/types.js';
export type { VersionStore };
import type { DesignSurfaceInput } from '../shared/schemas.js';
import { slugify } from '../shared/slugify.js';
import { serializeSurface } from '../server/surface-file.js';
import { META_KEYS } from '../shared/detectChangedPanes.js';

// === Builders ===

export function buildCanvasContent(overrides: Partial<CanvasContent> = {}): CanvasContent {
  return {
    id: overrides.id ?? 'default-canvas',
    type: 'diagram',
    content: JSON.stringify({ nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }] }),
    ...overrides,
  };
}

export function buildCheck(overrides: Partial<Check> = {}): Check {
  return {
    id: 'c1',
    question: 'Why does this work?',
    status: 'unanswered',
    answer: 'Because of X.',
    ...overrides,
  };
}

export function buildSection(overrides: Partial<Section> = {}): Section {
  const title = overrides.title ?? 'Test Section';
  return {
    id: slugify(title),
    title,
    canvases: [],
    deeperPatterns: [],
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

// === Study Mode Builders ===

/** Realistic predict-phase design_surface params with predictionScaffold. */
export function buildPredictToolCall(overrides?: {
  summary?: string;
  sectionTitle?: string;
  claims?: Array<{ id: string; prompt: string; type: 'choice' | 'fill-blank' | 'free-text'; options?: string[] }>;
}): Record<string, unknown> {
  const claims = overrides?.claims ?? [
    { id: 'c1', prompt: 'Who sends the next packet?', type: 'choice' as const, options: ['Client', 'Server', 'Either'] },
    { id: 'c2', prompt: 'The flag on the final packet is ___', type: 'fill-blank' as const },
    { id: 'c3', prompt: 'Why is a third packet needed?', type: 'free-text' as const },
  ];

  return {
    summary: overrides?.summary ?? 'TCP three-way handshake',
    sections: [{
      title: overrides?.sectionTitle ?? 'TCP Handshake',
      active: true,
      canvases: [{
        id: 'setup-seq',
        type: 'sequence',
        content: JSON.stringify({
          participants: [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server' }],
          messages: [
            { from: 'client', to: 'server', label: 'SYN' },
            { from: 'server', to: 'client', label: 'SYN-ACK' },
          ],
        }),
      }],
      deeperPatterns: [
        { pattern: 'Handshake protocols', connection: 'Both parties must agree before data flows.' },
        { pattern: 'State machines', connection: 'Each side transitions through CLOSED→SYN_SENT→ESTABLISHED.' },
      ],
      predictionScaffold: {
        question: 'What happens next in the TCP handshake?',
        claims,
      },
    }],
  };
}

/** Realistic explain-phase design_surface params targeting existing section. */
export function buildExplainToolCall(sectionId: string, overrides?: {
  summary?: string;
  explanation?: string;
  clearScaffold?: boolean;
}): DesignSurfaceInput {
  const clearScaffold = overrides?.clearScaffold ?? true;
  return {
    summary: overrides?.summary ?? 'TCP handshake explained',
    sections: [{
      id: sectionId,
      ...(clearScaffold ? { clear: ['predictionScaffold' as const] } : {}),
      canvases: [{
        id: 'full-seq',
        type: 'sequence',
        content: JSON.stringify({
          participants: [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server' }],
          messages: [
            { from: 'client', to: 'server', label: 'SYN' },
            { from: 'server', to: 'client', label: 'SYN-ACK' },
            { from: 'client', to: 'server', label: 'ACK' },
          ],
        }),
      }],
      explanation: overrides?.explanation ?? 'The client completes the handshake by sending an ACK.',
      deeperPatterns: [
        { pattern: 'Handshake protocols', connection: 'Mutual agreement before data exchange.' },
        { pattern: 'State machines', connection: 'CLOSED→SYN_SENT→ESTABLISHED on client side.' },
      ],
      checks: [{ question: 'Why can\'t TCP use a two-way handshake?', answer: 'Both sides need confirmation.' }],
      followups: ['How does TCP handle connection teardown?'],
    }],
  };
}

/** Simulate learner filling prediction claims (what submit-prediction does). */
export function fillPredictionClaims(
  doc: LearningDocument,
  sectionId: string,
  values: Record<string, string>,
): LearningDocument {
  const cloned = structuredClone(doc);
  const section = cloned.sections.find(s => s.id === sectionId);
  if (!section) throw new Error(`Section '${sectionId}' not found`);
  if (!section.predictionScaffold) throw new Error(`Section '${sectionId}' has no predictionScaffold`);

  for (const [claimId, value] of Object.entries(values)) {
    const claim = section.predictionScaffold.claims.find(c => c.id === claimId);
    if (!claim) throw new Error(`Claim '${claimId}' not found in section '${sectionId}'`);
    claim.value = value;
  }

  return cloned;
}

// === Fixture .surface Strings ===

// Generated from builders — stays in sync with format changes automatically.
export const MINIMAL_DOC = serializeSurface(buildDocument({
  sections: [buildSection({ title: 'Introduction', explanation: 'This is the introduction.' })],
  activeSection: 'introduction',
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
      const active = getActiveSection(doc);
      const surface: Record<string, unknown> = {};
      if (active) {
        for (const [key, value] of Object.entries(active)) {
          if (META_KEYS.has(key)) continue;
          surface[key] = value ?? null;
        }
      }
      return {
        session: { topic: 'test', version: doc.version, activeSection: doc.activeSection },
        mode: 'answer' as const,
        phase: 'explain' as const,
        surface,
        sections: doc.sections.map(section => ({ id: section.id, title: section.title, canvasIds: section.canvases.map(canvas => canvas.id) })),
        promptHistory: [],
      };
    },
  };
}
