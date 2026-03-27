import type { LearningDocument, CanvasContent, Block } from '../shared/document.js';
import {
  type DesignSurfaceInput,
  type CanvasInput,
  DiagramDataSchema,
  TimelineDataSchema,
  ProofDataSchema,
  SequenceDataSchema,
} from '../shared/schemas.js';
import type { ZodType } from 'zod';

// === Constants ===

const MAX_CANVASES = 4;

/** Maps structured canvas types to their Zod validation schemas. */
const STRUCTURED_SCHEMAS: Record<string, ZodType> = {
  diagram: DiagramDataSchema,
  timeline: TimelineDataSchema,
  proof: ProofDataSchema,
  sequence: SequenceDataSchema,
};

// === Result Types ===

export interface DesignSurfaceResult {
  version: number;
  canvasResults: Record<string, { success: boolean; error?: string }>;
  errors: string[];
}

// === Canvas Content Validation ===

function validateCanvasContent(canvas: CanvasInput): string | null {
  const schema = STRUCTURED_SCHEMAS[canvas.type];
  if (!schema) return null;

  let data: unknown;
  try {
    data = JSON.parse(canvas.content);
  } catch {
    return `Invalid ${canvas.type} content: not valid JSON`;
  }

  const validation = schema.safeParse(data);
  if (!validation.success) return `Invalid ${canvas.type}: ${validation.error.issues[0]?.message ?? 'validation failed'}`;
  return null;
}

// === Canvas Replace ===

function replaceCanvases(
  inputs: CanvasInput[],
  errors: string[],
  canvasResults: Record<string, { success: boolean; error?: string }>,
): CanvasContent[] {
  const result: CanvasContent[] = [];

  for (const canvasInput of inputs) {
    const validationError = validateCanvasContent(canvasInput);
    if (validationError) {
      canvasResults[canvasInput.id] = { success: false, error: validationError };
      errors.push(`Canvas '${canvasInput.id}': ${validationError}`);
      continue;
    }

    if (result.length >= MAX_CANVASES) {
      const acceptedIds = result.map(c => c.id).join(', ');
      const capError = `Maximum ${MAX_CANVASES} canvases. Cannot add '${canvasInput.id}'. Accepted: [${acceptedIds}]`;
      canvasResults[canvasInput.id] = { success: false, error: capError };
      errors.push(capError);
      continue;
    }

    const canvas: CanvasContent = {
      id: canvasInput.id,
      type: canvasInput.type,
      content: canvasInput.content,
      ...(canvasInput.language ? { language: canvasInput.language } : {}),
    };

    result.push(canvas);
    canvasResults[canvasInput.id] = { success: true };
  }

  return result;
}

// === Block Assignment ===

function assignBlocks(inputs: import('../shared/schemas.js').BlockInput[]): Block[] {
  return inputs.map((input, index) => {
    const id = `b${index + 1}`;
    switch (input.type) {
      case 'text':
        return { id, type: 'text' as const, content: input.content };
      case 'interactive':
        return { id, type: 'interactive' as const, prompt: input.prompt, response: null };
      case 'feedback':
        return { id, type: 'feedback' as const, targetBlockId: input.targetBlockId, correct: input.correct, content: input.content };
      case 'deeper-patterns':
        return { id, type: 'deeper-patterns' as const, patterns: input.patterns.map(p => ({ pattern: p.pattern, connection: p.connection })) };
      case 'suggestions':
        return { id, type: 'suggestions' as const, items: input.items };
    }
  });
}

// === Public API ===

/**
 * Pure function: apply a design_surface operation to a document.
 * No I/O, no side effects — data in, data out.
 *
 * Partial success: invalid fields return errors, valid fields still apply.
 */
export function applyDesignSurface(
  doc: LearningDocument,
  params: DesignSurfaceInput,
): { doc: LearningDocument; results: DesignSurfaceResult } {
  const cloned = structuredClone(doc);
  const errors: string[] = [];
  const canvasResults: Record<string, { success: boolean; error?: string }> = {};

  // Summary — update document label / chat title
  if (params.summary) {
    cloned.summary = params.summary;
  }

  // Clear — handle ['canvases'] and ['blocks']
  if (params.clear && params.clear.length > 0) {
    for (const target of params.clear) {
      switch (target) {
        case 'canvases':
          cloned.canvases = [];
          break;
        case 'blocks':
          cloned.blocks = [];
          break;
      }
    }
  }

  // Canvases — replace entirely (max 4)
  if (params.canvases) {
    cloned.canvases = replaceCanvases(params.canvases, errors, canvasResults);
  }

  // Blocks — replace entirely, assign IDs b1, b2, ..., set response: null on interactive
  if (params.blocks) {
    cloned.blocks = assignBlocks(params.blocks);
  }

  return {
    doc: cloned,
    results: {
      version: cloned.version,
      canvasResults,
      errors,
    },
  };
}
