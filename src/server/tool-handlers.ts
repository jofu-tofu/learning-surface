import type { LearningDocument, Section, CanvasContent, Check, DeeperPattern } from '../shared/types.js';
import {
  type DesignSurfaceInput,
  type SectionUpdateInput,
  type CanvasInput,
  DiagramDataSchema,
  TimelineDataSchema,
  ProofDataSchema,
  SequenceDataSchema,
} from '../shared/schemas.js';
import type { ZodType } from 'zod';
import { slugify } from '../shared/slugify.js';

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

interface CanvasResult {
  success: boolean;
  error?: string;
}

interface SectionResult {
  id: string;
  results: {
    title?: boolean;
    canvases?: Record<string, CanvasResult>;
    explanation?: boolean;
    deeperPatterns?: boolean;
    checks?: Record<string, boolean>;
    followups?: boolean;
    clear?: boolean;
    active?: boolean;
  };
}

export interface DesignSurfaceResult {
  version: number;
  sections: SectionResult[];
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

// === Section Helpers ===

function findSectionById(doc: LearningDocument, id: string): Section | undefined {
  return doc.sections.find(section => section.id === id);
}

function createSection(title: string): Section {
  return {
    id: slugify(title),
    title,
    canvases: [],
    deeperPatterns: [],
  };
}

// === Core Merge Logic ===

function applySectionUpdate(
  doc: LearningDocument,
  update: SectionUpdateInput,
  errors: string[],
): SectionResult {
  // Resolve or create section
  let section: Section | undefined;
  let isNew = false;

  if (update.id) {
    section = findSectionById(doc, update.id);
    if (!section) {
      const availableIds = doc.sections.map(section => section.id).join(', ');
      errors.push(`Section '${update.id}' not found. Available: [${availableIds}]`);
      return { id: update.id, results: {} };
    }
  } else if (update.title) {
    section = createSection(update.title);
    isNew = true;

    // Auto-remove empty "Untitled" placeholder
    const untitledIndex = doc.sections.findIndex(section => section.id === 'untitled');
    if (untitledIndex !== -1) {
      const untitled = doc.sections[untitledIndex];
      const isEmpty = untitled.canvases.length === 0 &&
        !untitled.explanation &&
        !untitled.checks?.length &&
        !untitled.followups?.length;
      if (isEmpty) {
        doc.sections.splice(untitledIndex, 1);
        if (doc.activeSection === 'untitled') {
          doc.activeSection = section.id;
        }
      }
    }

    doc.sections.push(section);
  } else {
    errors.push("Section requires either 'id' (existing) or 'title' (new)");
    return { id: '', results: {} };
  }

  const result: SectionResult = { id: section.id, results: {} };

  // Update title if specified on existing section
  if (update.title && !isNew) {
    section.title = update.title;
    result.results.title = true;
  }

  // Apply clear BEFORE other changes
  if (update.clear && update.clear.length > 0) {
    for (const target of update.clear) {
      switch (target) {
        case 'canvases':
          section.canvases = [];
          break;
        case 'explanation':
          delete section.explanation;
          break;
        case 'checks':
          delete section.checks;
          break;
        case 'deeperPatterns':
          section.deeperPatterns = [];
          break;
        case 'followups':
          delete section.followups;
          break;
      }
    }
    result.results.clear = true;
  }

  // Canvases: upsert by ID
  if (update.canvases) {
    const canvasResults: Record<string, CanvasResult> = {};

    for (const canvasInput of update.canvases) {
      // Validate structured content
      const validationError = validateCanvasContent(canvasInput);
      if (validationError) {
        canvasResults[canvasInput.id] = { success: false, error: validationError };
        errors.push(`Section '${section.id}' canvas '${canvasInput.id}': ${validationError}`);
        continue;
      }

      const existingIndex = section.canvases.findIndex(canvas => canvas.id === canvasInput.id);
      const canvas: CanvasContent = {
        id: canvasInput.id,
        type: canvasInput.type,
        content: canvasInput.content,
        ...(canvasInput.language ? { language: canvasInput.language } : {}),
      };

      if (existingIndex >= 0) {
        // Replace existing
        section.canvases[existingIndex] = canvas;
        canvasResults[canvasInput.id] = { success: true };
      } else if (section.canvases.length < MAX_CANVASES) {
        // Append new
        section.canvases.push(canvas);
        canvasResults[canvasInput.id] = { success: true };
      } else {
        // Cap exceeded
        const existingIds = section.canvases.map(canvas => canvas.id).join(', ');
        const capError = `Maximum ${MAX_CANVASES} canvases. Cannot add '${canvasInput.id}'. Existing: [${existingIds}]`;
        canvasResults[canvasInput.id] = { success: false, error: capError };
        errors.push(`Section '${section.id}': ${capError}`);
      }
    }

    result.results.canvases = canvasResults;
  }

  // Explanation: replace
  if (update.explanation !== undefined) {
    section.explanation = update.explanation;
    result.results.explanation = true;
  }

  // Deeper patterns: replace
  if (update.deeperPatterns !== undefined) {
    section.deeperPatterns = update.deeperPatterns.map(dp => ({
      pattern: dp.pattern,
      connection: dp.connection,
    }));
    result.results.deeperPatterns = true;
  }

  // Checks: append
  if (update.checks) {
    if (!section.checks) section.checks = [];
    const checkResults: Record<string, boolean> = {};

    for (const checkInput of update.checks) {
      const id = `c${section.checks.length + 1}`;
      const check: Check = {
        id,
        question: checkInput.question,
        status: 'unanswered',
        ...(checkInput.hints ? { hints: checkInput.hints } : {}),
        answer: checkInput.answer,
        ...(checkInput.answerExplanation ? { answerExplanation: checkInput.answerExplanation } : {}),
      };
      section.checks.push(check);
      checkResults[id] = true;
    }

    result.results.checks = checkResults;
  }

  // Followups: replace
  if (update.followups !== undefined) {
    section.followups = update.followups;
    result.results.followups = true;
  }

  // Active: set active section
  if (update.active) {
    doc.activeSection = section.id;
    result.results.active = true;
  }

  return result;
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
  const sectionResults: SectionResult[] = [];

  // Summary — update document label / chat title
  if (params.summary) {
    cloned.summary = params.summary;
  }

  // clearAll — reset entire document
  if (params.clearAll) {
    cloned.sections = [{
      id: 'start',
      title: 'Start',
      canvases: [],
      deeperPatterns: [],
    }];
    cloned.activeSection = 'start';
    delete cloned.summary;
    return {
      doc: cloned,
      results: { version: cloned.version, sections: [], errors: [] },
    };
  }

  // removeSection — delete a section by ID
  if (params.removeSection) {
    const sectionIdToRemove = params.removeSection;
    if (cloned.sections.length <= 1) {
      errors.push(`Cannot remove last section '${sectionIdToRemove}'. Use clearAll instead.`);
    } else {
      const removeIndex = cloned.sections.findIndex(section => section.id === sectionIdToRemove);
      if (removeIndex === -1) {
        const availableIds = cloned.sections.map(section => section.id).join(', ');
        errors.push(`removeSection: '${sectionIdToRemove}' not found. Available: [${availableIds}]`);
      } else {
        cloned.sections.splice(removeIndex, 1);
        if (cloned.activeSection === sectionIdToRemove && cloned.sections.length > 0) {
          cloned.activeSection = cloned.sections[cloned.sections.length - 1].id;
        }
      }
    }
  }

  // Apply section updates
  if (params.sections) {
    for (const update of params.sections) {
      const result = applySectionUpdate(cloned, update, errors);
      sectionResults.push(result);
    }
  }

  return {
    doc: cloned,
    results: {
      version: cloned.version,
      sections: sectionResults,
      errors,
    },
  };
}
