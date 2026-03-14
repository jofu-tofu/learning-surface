import type { LearningDocument, Section, CanvasContent, Check } from '../shared/types.js';
import type { ToolName } from '../shared/schemas.js';
import { slugify } from '../shared/slugify.js';
import { blockTypes } from './blocks/registry.js';

type ToolHandler = (doc: LearningDocument, params: Record<string, unknown>) => void;

function withActiveSection(
  doc: LearningDocument,
  sectionCallback: (section: Section) => void,
): void {
  const activeSection = doc.sections.find(section => section.id === doc.activeSection);
  if (activeSection) sectionCallback(activeSection);
}

const handlers: Record<ToolName, ToolHandler> = {
  new_section(doc, params) {
    const title = params.title as string;
    const newSection: Section = {
      id: slugify(title),
      title,
    };

    // Auto-remove the empty "Untitled" placeholder when a real section is created
    const untitledIndex = doc.sections.findIndex(section => section.id === 'untitled');
    if (untitledIndex !== -1) {
      const untitledSection = doc.sections[untitledIndex];
      const isEmpty = !untitledSection.canvas && !untitledSection.explanation && !untitledSection.checks?.length && !untitledSection.followups?.length;
      if (isEmpty) {
        doc.sections.splice(untitledIndex, 1);
        if (doc.activeSection === 'untitled') {
          doc.activeSection = newSection.id;
        }
      }
    }

    doc.sections.push(newSection);
  },

  show_visual(doc, params) {
    withActiveSection(doc, (activeSection) => {
      activeSection.canvas = {
        type: params.type as CanvasContent['type'],
        content: params.content as string,
      };
      if (params.language) {
        activeSection.canvas.language = params.language as string;
      }
    });
  },

  show_diagram(doc, params) {
    withActiveSection(doc, (activeSection) => {
      const { nodes, edges, direction } = params as {
        nodes: unknown[]; edges: unknown[]; direction?: string;
      };
      const payload: Record<string, unknown> = { nodes, edges };
      if (direction) payload.direction = direction;
      activeSection.canvas = { type: 'diagram', content: JSON.stringify(payload) };
    });
  },

  show_timeline(doc, params) {
    withActiveSection(doc, (activeSection) => {
      const { events, direction } = params as { events: unknown[]; direction?: string };
      const payload: Record<string, unknown> = { events };
      if (direction) payload.direction = direction;
      activeSection.canvas = { type: 'timeline', content: JSON.stringify(payload) };
    });
  },

  derive(doc, params) {
    withActiveSection(doc, (activeSection) => {
      const { title, premises, steps } = params as { title?: string; premises?: string[]; steps: unknown[] };
      const payload: Record<string, unknown> = { steps };
      if (title) payload.title = title;
      if (premises) payload.premises = premises;
      activeSection.canvas = { type: 'proof', content: JSON.stringify(payload) };
    });
  },

  explain(doc, params) {
    withActiveSection(doc, (activeSection) => {
      activeSection.explanation = params.content as string;
    });
  },

  extend(doc, params) {
    withActiveSection(doc, (activeSection) => {
      activeSection.explanation = (activeSection.explanation ?? '') + (params.content as string);
    });
  },

  challenge(doc, params) {
    withActiveSection(doc, (activeSection) => {
      if (!activeSection.checks) activeSection.checks = [];
      const check: Check = {
        id: `c${activeSection.checks.length + 1}`,
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
      activeSection.checks.push(check);
    });
  },

  suggest_followups(doc, params) {
    withActiveSection(doc, (activeSection) => {
      activeSection.followups = params.questions as string[];
    });
  },

  set_active(doc, params) {
    doc.activeSection = params.section as string;
  },

  build_visual(doc, params) {
    withActiveSection(doc, (activeSection) => {
      if (activeSection.canvas) {
        activeSection.canvas.content = activeSection.canvas.content + '\n' + (params.additions as string);
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
      const sectionIndex = doc.sections.findIndex(section => section.id === id);
      if (sectionIndex === -1) return;
      doc.sections.splice(sectionIndex, 1);
      // If we removed the active section, fall back to the last remaining section
      if (doc.activeSection === id && doc.sections.length > 0) {
        doc.activeSection = doc.sections[doc.sections.length - 1].id;
      }
      return;
    }

    const sectionId = params.section as string | undefined;
    const section = sectionId
      ? doc.sections.find(section => section.id === sectionId)
      : doc.sections.find(section => section.id === doc.activeSection);
    if (!section) return;

    if (blockTypes().includes(target)) {
      delete (section as unknown as Record<string, unknown>)[target];
    }
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
