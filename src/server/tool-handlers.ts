import type { LearningDocument, Section, CanvasContent, Check } from '../shared/types.js';
import type { ToolName } from '../shared/schemas.js';
import { slugify } from '../shared/slugify.js';

type ToolHandler = (doc: LearningDocument, params: Record<string, unknown>) => void;

function withActiveSection(
  doc: LearningDocument,
  fn: (section: Section) => void,
): void {
  const active = doc.sections.find(s => s.id === doc.activeSection);
  if (active) fn(active);
}

const handlers: Record<ToolName, ToolHandler> = {
  new_section(doc, params) {
    const title = params.title as string;
    const newSection: Section = {
      id: slugify(title),
      title,
    };

    // Auto-remove the empty "Untitled" placeholder when a real section is created
    const untitledIdx = doc.sections.findIndex(s => s.id === 'untitled');
    if (untitledIdx !== -1) {
      const u = doc.sections[untitledIdx];
      const isEmpty = !u.canvas && !u.explanation && !u.checks?.length && !u.followups?.length;
      if (isEmpty) {
        doc.sections.splice(untitledIdx, 1);
        if (doc.activeSection === 'untitled') {
          doc.activeSection = newSection.id;
        }
      }
    }

    doc.sections.push(newSection);
  },

  show_visual(doc, params) {
    withActiveSection(doc, (active) => {
      active.canvas = {
        type: params.type as CanvasContent['type'],
        content: params.content as string,
      };
      if (params.language) {
        active.canvas.language = params.language as string;
      }
    });
  },

  show_diagram(doc, params) {
    withActiveSection(doc, (active) => {
      const { nodes, edges, direction } = params as {
        nodes: unknown[]; edges: unknown[]; direction?: string;
      };
      const payload: Record<string, unknown> = { nodes, edges };
      if (direction) payload.direction = direction;
      active.canvas = { type: 'diagram', content: JSON.stringify(payload) };
    });
  },

  explain(doc, params) {
    withActiveSection(doc, (active) => {
      active.explanation = params.content as string;
    });
  },

  extend(doc, params) {
    withActiveSection(doc, (active) => {
      active.explanation = (active.explanation ?? '') + (params.content as string);
    });
  },

  challenge(doc, params) {
    withActiveSection(doc, (active) => {
      if (!active.checks) active.checks = [];
      const check: Check = {
        id: `c${active.checks.length + 1}`,
        question: params.question as string,
        status: 'unanswered',
      };
      if (params.hints) {
        check.hints = params.hints as string[];
      }
      if (params.answer) {
        check.answer = params.answer as string;
      }
      if (params.answerExplanation) {
        check.answerExplanation = params.answerExplanation as string;
      }
      active.checks.push(check);
    });
  },

  suggest_followups(doc, params) {
    withActiveSection(doc, (active) => {
      active.followups = params.questions as string[];
    });
  },

  set_active(doc, params) {
    doc.activeSection = params.section as string;
  },

  build_visual(doc, params) {
    withActiveSection(doc, (active) => {
      if (active.canvas) {
        active.canvas.content = active.canvas.content + '\n' + (params.additions as string);
      }
    });
  },

  clear(doc, params) {
    const target = params.target as string;

    if (target === 'all') {
      doc.sections.length = 0;
      doc.sections.push({
        id: 'start',
        title: 'Start',
      });
      doc.activeSection = 'start';
      delete doc.summary;
      return;
    }

    if (target === 'section') {
      if (doc.sections.length <= 1) return; // guard: keep at least one section
      const sectionId = params.section as string | undefined;
      const id = sectionId ?? doc.activeSection;
      const idx = doc.sections.findIndex(s => s.id === id);
      if (idx === -1) return;
      doc.sections.splice(idx, 1);
      // If we removed the active section, fall back to the last remaining section
      if (doc.activeSection === id && doc.sections.length > 0) {
        doc.activeSection = doc.sections[doc.sections.length - 1].id;
      }
      return;
    }

    const sectionId = params.section as string | undefined;
    const section = sectionId
      ? doc.sections.find(s => s.id === sectionId)
      : doc.sections.find(s => s.id === doc.activeSection);
    if (!section) return;

    if (target === 'canvas') delete section.canvas;
    else if (target === 'explanation') delete section.explanation;
    else if (target === 'checks') delete section.checks;
    else if (target === 'followups') delete section.followups;
  },
};

export function applyTool(
  doc: LearningDocument,
  tool: string,
  params: Record<string, unknown>,
): void {
  if (!(tool in handlers)) throw new Error(`Unknown tool: ${tool}`);
  handlers[tool as ToolName](doc, params);
}
