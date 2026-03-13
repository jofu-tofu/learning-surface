import type { Section } from '../../shared/types.js';
import type { BlockDefinition, BlockFormatDescription } from './types.js';

const HEADER_PATTERN = /^###\s+followups\s*$/;

export const followupsBlock: BlockDefinition = {
  type: 'followups',

  match(header: string) {
    return header.match(HEADER_PATTERN);
  },

  parse(_header: string, content: string, section: Section) {
    section.followups = content
      .split('\n')
      .filter(line => line.match(/^\s*-\s+/))
      .map(line => line.replace(/^\s*-\s+/, '').trim());
  },

  serialize(section: Section): string[] {
    if (!section.followups) return [];
    const lines: string[] = ['### followups'];
    for (const followup of section.followups) {
      lines.push(`- ${followup}`);
    }
    lines.push('');
    return lines;
  },

  describe(): BlockFormatDescription {
    return {
      header: '`### followups`',
      maxPerSection: '1',
      contentFormat: 'Markdown unordered list',
    };
  },
};
