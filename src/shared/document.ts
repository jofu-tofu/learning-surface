// === .surface File Data Model ===
// Defines the structure of a learning document — the core data that gets
// persisted to .surface JSON files and rendered in the UI.

/** Canonical list of canvas types — single source of truth for types.ts, schemas.ts, and block definitions. */
export const CANVAS_TYPES = ['katex', 'code', 'diagram', 'timeline', 'proof', 'sequence'] as const;
type CanvasType = (typeof CANVAS_TYPES)[number];

/** Runtime canvas content — mirrors CanvasInputSchema in schemas.ts (same fields). */
export interface CanvasContent {
  id: string;          // unique within document, for targeting (e.g. "architecture", "data-flow")
  type: CanvasType;
  content: string;
  language?: string;   // for code type
}

export interface DeeperPattern {
  pattern: string;         // the recurring / universal concept
  connection: string;      // how this topic relates to it — bridges from known to new
}

// === Block Types ===

export type BlockType = 'text' | 'interactive' | 'feedback' | 'deeper-patterns' | 'suggestions';

export interface TextBlock {
  id: string;
  type: 'text';
  content: string; // markdown — passive content the learner reads
}

export interface InteractiveBlock {
  id: string;
  type: 'interactive';
  prompt: string;              // the question
  response?: string | null;    // learner's free-text answer (null until filled)
}

export interface FeedbackBlock {
  id: string;
  type: 'feedback';
  targetBlockId: string;      // references interactive block ID from previous version
  correct: boolean | null;    // null when correctness is ambiguous
  content: string;            // markdown — evaluation + explanation
}

export interface DeeperPatternsBlock {
  id: string;
  type: 'deeper-patterns';
  patterns: DeeperPattern[];  // structured data: {pattern, connection}[]
}

export interface SuggestionsBlock {
  id: string;
  type: 'suggestions';
  items: string[];            // clickable next-action prompts
}

export type Block = TextBlock | InteractiveBlock | FeedbackBlock | DeeperPatternsBlock | SuggestionsBlock;

// === Document Model ===

export interface LearningDocument {
  version: number;
  summary?: string;            // AI-generated label (chat title for v1)
  canvases: CanvasContent[];   // left pane
  blocks: Block[];             // right pane
}
