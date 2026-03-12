import type { LearningDocument, Section, CanvasContent, Check } from '../shared/types.js';
import { slugify } from '../shared/slugify.js';

type ToolHandler = (doc: LearningDocument, params: Record<string, unknown>) => void;

function withActiveSection(
  doc: LearningDocument,
  fn: (section: Section) => void,
): void {
  const active = doc.sections.find(s => s.id === doc.activeSection);
  if (active) fn(active);
}

const handlers: Record<string, ToolHandler> = {
  new_section(doc, params) {
    const title = params.title as string;
    const newSection: Section = {
      id: slugify(title),
      title,
      status: 'active',
    };
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
      active.checks.push(check);
    });
  },

  suggest_followups(doc, params) {
    withActiveSection(doc, (active) => {
      active.followups = params.questions as string[];
    });
  },

  complete_section(doc, params) {
    const sectionId = params.section as string;
    const section = doc.sections.find(s => s.id === sectionId);
    if (section) {
      section.status = 'completed';
    }
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

  reveal(doc, params) {
    withActiveSection(doc, (active) => {
      if (active.checks) {
        const check = active.checks.find(c => c.id === params.checkId);
        if (check) {
          check.status = 'revealed';
          check.answer = params.answer as string;
          check.answerExplanation = params.explanation as string;
        }
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
        status: 'active',
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
  const handler = handlers[tool];
  if (!handler) throw new Error(`Unknown tool: ${tool}`);
  handler(doc, params);
}
