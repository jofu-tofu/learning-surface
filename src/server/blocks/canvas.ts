import type { Section, CanvasContent } from '../../shared/types.js';
import { CANVAS_TYPES } from '../../shared/types.js';
import type { BlockDefinition, BlockFormatDescription } from './types.js';

const HEADER_PATTERN = /^###\s+canvas:\s*(\S+)(?:\s+(\S+))?/;

export const canvasBlock: BlockDefinition = {
  type: 'canvas',

  match(header: string) {
    return header.match(HEADER_PATTERN);
  },

  parse(header: string, content: string, section: Section) {
    const headerMatch = header.match(HEADER_PATTERN);
    if (!headerMatch) return;
    section.canvas = { type: headerMatch[1] as CanvasContent['type'], content };
    if (headerMatch[2]) section.canvas.language = headerMatch[2];
  },

  serialize(section: Section): string[] {
    if (!section.canvas) return [];
    const header = section.canvas.language
      ? `### canvas: ${section.canvas.type} ${section.canvas.language}`
      : `### canvas: ${section.canvas.type}`;
    return [
      header,
      section.canvas.content,
      '',
    ];
  },

  describe(): BlockFormatDescription {
    return {
      header: `\`### canvas: TYPE\` (${CANVAS_TYPES.join(', ')})`,
      maxPerSection: '1',
      contentFormat: 'Raw content until next heading',
      notes: 'For diagram, content is JSON. Prefer diagram over mermaid — the rendering is cleaner.',
    };
  },
};
