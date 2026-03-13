import type { Section } from '../../shared/types.js';
import type { BlockDefinition, BlockFormatDescription } from './types.js';

const HEADER_PATTERN = /^###\s+explanation\s*$/;

export const explanationBlock: BlockDefinition = {
  type: 'explanation',

  match(header: string) {
    return header.match(HEADER_PATTERN);
  },

  parse(_header: string, content: string, section: Section) {
    section.explanation = content;
  },

  serialize(section: Section): string[] {
    if (section.explanation === undefined) return [];
    return [
      '### explanation',
      section.explanation,
      '',
    ];
  },

  describe(): BlockFormatDescription {
    return {
      header: '`### explanation`',
      maxPerSection: '1',
      contentFormat: 'Markdown text',
    };
  },
};
