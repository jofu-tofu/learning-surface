import type { LearningDocument, Section, CanvasContent, Check, PredictionScaffold, PredictionClaim } from '../shared/types.js';
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
    predictionScaffold?: boolean;
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

// === Section Update Helpers ===

function resolveOrCreateSection(
  doc: LearningDocument,
  update: SectionUpdateInput,
  errors: string[],
): { section: Section; isNew: boolean } | { errorResult: SectionResult } {
  if (update.id) {
    const section = findSectionById(doc, update.id);
    if (!section) {
      const availableIds = doc.sections.map(section => section.id).join(', ');
      errors.push(`Section '${update.id}' not found. Available: [${availableIds}]`);
      return { errorResult: { id: update.id, results: {} } };
    }
    return { section, isNew: false };
  } else if (update.title) {
    const section = createSection(update.title);

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
    return { section, isNew: true };
  } else {
    errors.push("Section requires either 'id' (existing) or 'title' (new)");
    return { errorResult: { id: '', results: {} } };
  }
}

function updateTitle(section: Section, update: SectionUpdateInput, isNew: boolean, result: SectionResult): void {
  if (update.title && !isNew) {
    section.title = update.title;
    result.results.title = true;
  }
}

function clearFields(section: Section, update: SectionUpdateInput, result: SectionResult): void {
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
        case 'predictionScaffold':
          delete section.predictionScaffold;
          delete section.phase;
          break;
      }
    }
    result.results.clear = true;
  }
}

function upsertCanvases(section: Section, update: SectionUpdateInput, errors: string[], result: SectionResult): void {
  if (!update.canvases) return;

  const canvasResults: Record<string, CanvasResult> = {};

  for (const canvasInput of update.canvases) {
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
      section.canvases[existingIndex] = canvas;
      canvasResults[canvasInput.id] = { success: true };
    } else if (section.canvases.length < MAX_CANVASES) {
      section.canvases.push(canvas);
      canvasResults[canvasInput.id] = { success: true };
    } else {
      const existingIds = section.canvases.map(canvas => canvas.id).join(', ');
      const capError = `Maximum ${MAX_CANVASES} canvases. Cannot add '${canvasInput.id}'. Existing: [${existingIds}]`;
      canvasResults[canvasInput.id] = { success: false, error: capError };
      errors.push(`Section '${section.id}': ${capError}`);
    }
  }

  result.results.canvases = canvasResults;
}

function updateExplanation(section: Section, update: SectionUpdateInput, result: SectionResult): void {
  if (update.explanation !== undefined) {
    section.explanation = update.explanation;
    // Auto-transition from predict → explain when the AI writes explanation content.
    // This ensures the UI switches from the Prediction pane to the Explanation pane
    // only when there's actual content to show.
    if (section.phase === 'predict') {
      section.phase = 'explain';
    }
    result.results.explanation = true;
  }
}

function updateDeeperPatterns(section: Section, update: SectionUpdateInput, result: SectionResult): void {
  if (update.deeperPatterns !== undefined) {
    section.deeperPatterns = update.deeperPatterns.map(dp => ({
      pattern: dp.pattern,
      connection: dp.connection,
    }));
    result.results.deeperPatterns = true;
  }
}

function appendChecks(section: Section, update: SectionUpdateInput, result: SectionResult): void {
  if (!update.checks) return;

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

function updateFollowups(section: Section, update: SectionUpdateInput, result: SectionResult): void {
  if (update.followups !== undefined) {
    section.followups = update.followups;
    result.results.followups = true;
  }
}

function updatePredictionScaffold(section: Section, update: SectionUpdateInput, result: SectionResult): void {
  // The predict-phase schema uses 'predictionScaffold' — it arrives on the update object via the AI tool call
  const scaffoldInput = (update as Record<string, unknown>).predictionScaffold as
    { question: string; claims: Array<{ id: string; prompt: string; type: 'choice' | 'fill-blank' | 'free-text'; options?: string[] }> } | undefined;
  if (!scaffoldInput) return;

  const claims: PredictionClaim[] = scaffoldInput.claims.map(c => ({
    id: c.id,
    prompt: c.prompt,
    type: c.type,
    ...(c.options ? { options: c.options } : {}),
    value: null, // always null when AI creates scaffold — learner fills in later
  }));

  const scaffold: PredictionScaffold = {
    question: scaffoldInput.question,
    claims,
  };

  section.predictionScaffold = scaffold;
  section.phase = 'predict';
  result.results.predictionScaffold = true;
}

function setActiveSection(doc: LearningDocument, section: Section, update: SectionUpdateInput, result: SectionResult): void {
  if (update.active) {
    doc.activeSection = section.id;
    result.results.active = true;
  }
}

// === Core Merge Logic ===

function applySectionUpdate(
  doc: LearningDocument,
  update: SectionUpdateInput,
  errors: string[],
): SectionResult {
  const resolved = resolveOrCreateSection(doc, update, errors);
  if ('errorResult' in resolved) return resolved.errorResult;

  const { section, isNew } = resolved;
  const result: SectionResult = { id: section.id, results: {} };

  updateTitle(section, update, isNew, result);
  clearFields(section, update, result);
  upsertCanvases(section, update, errors, result);
  updateExplanation(section, update, result);
  updateDeeperPatterns(section, update, result);
  appendChecks(section, update, result);
  updateFollowups(section, update, result);
  updatePredictionScaffold(section, update, result);
  setActiveSection(doc, section, update, result);

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
