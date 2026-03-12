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
    });
  },

  explain(doc, params) {
    withActiveSection(doc, (active) => {
      active.explanation = params.content as string;
    });
  },

  edit_visual(doc, params) {
    withActiveSection(doc, (active) => {
      if (active.canvas) {
        active.canvas.content = active.canvas.content.replace(
          params.find as string,
          params.replace as string,
        );
      }
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

  annotate(doc, params) {
    withActiveSection(doc, (active) => {
      if (active.canvas) {
        active.canvas.content = active.canvas.content + '\n' + `%% ${params.label}: ${params.element}`;
      }
    });
  },

  edit_explanation(doc, params) {
    withActiveSection(doc, (active) => {
      if (active.explanation !== undefined) {
        active.explanation = active.explanation.replace(
          params.find as string,
          params.replace as string,
        );
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
