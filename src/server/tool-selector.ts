import { TOOL_DEFS } from '../shared/schemas.js';
import type { LearningDocument, CanvasContent } from '../shared/types.js';

/** Canvas types where content is plain text (appendable via build_visual). */
const TEXT_CANVAS_TYPES = new Set(['mermaid', 'katex', 'code']);

export interface ToolSelectionContext {
  document: LearningDocument | null;
  hasCanvas: boolean;
  canvasType: CanvasContent['type'] | null;
  hasExplanation: boolean;
  sectionCount: number;
}

export function buildSelectionContext(doc: LearningDocument | null): ToolSelectionContext {
  if (!doc) return { document: null, hasCanvas: false, canvasType: null, hasExplanation: false, sectionCount: 0 };
  const active = doc.sections.find(s => s.id === doc.activeSection);
  return {
    document: doc,
    hasCanvas: !!active?.canvas,
    canvasType: active?.canvas?.type ?? null,
    hasExplanation: !!active?.explanation,
    sectionCount: doc.sections.length,
  };
}

export function selectTools(ctx: ToolSelectionContext): typeof TOOL_DEFS[number][] {
  return TOOL_DEFS.filter(tool => {
    switch (tool.availability) {
      case 'always': return true;
      case 'needs-section': return ctx.sectionCount > 1;
      case 'needs-canvas': return ctx.hasCanvas;
      case 'needs-text-canvas': return ctx.canvasType !== null && TEXT_CANVAS_TYPES.has(ctx.canvasType);
      case 'needs-explanation': return ctx.hasExplanation;
      default: return true;
    }
  });
}
