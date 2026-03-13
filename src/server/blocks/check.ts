import type { Section, Check } from '../../shared/types.js';
import type { BlockDefinition, BlockFormatDescription } from './types.js';

const HEADER_PATTERN = /^###\s+check:\s*(\S+)/;

function extractComment(line: string, key: string): string | null {
  const m = line.match(new RegExp(`<!--\\s*${key}:\\s*(.*?)\\s*-->`));
  return m ? m[1] : null;
}

export const checkBlock: BlockDefinition = {
  type: 'checks',

  match(header: string) {
    return header.match(HEADER_PATTERN);
  },

  parse(header: string, content: string, section: Section) {
    const m = header.match(HEADER_PATTERN);
    if (!m) return;

    const checkId = m[1];
    const lines = content.split('\n');
    let question = '';
    let status: Check['status'] = 'unanswered';
    let hints: string[] | undefined;
    let answer: string | undefined;
    let answerExplanation: string | undefined;

    const nonEmpty = lines.filter(l => l.trim() !== '');
    for (const line of nonEmpty) {
      const trimmed = line.trim();
      if (trimmed.startsWith('<!--')) {
        const statusVal = trimmed.match(/<!--\s*status:\s*(unanswered|attempted|revealed)\s*-->/)?.[1];
        if (statusVal) { status = statusVal as Check['status']; continue; }
        const hintsVal = extractComment(trimmed, 'hints');
        if (hintsVal) { try { hints = JSON.parse(hintsVal); } catch { /* ignore malformed */ } continue; }
        const answerVal = extractComment(trimmed, 'answer');
        if (answerVal) { answer = answerVal; continue; }
        const explVal = extractComment(trimmed, 'explanation');
        if (explVal) { answerExplanation = explVal; continue; }
      }
      if (!question) { question = trimmed; }
    }

    const check: Check = { id: checkId, question, status };
    if (hints) check.hints = hints;
    if (answer !== undefined) check.answer = answer;
    if (answerExplanation !== undefined) check.answerExplanation = answerExplanation;

    if (!section.checks) section.checks = [];
    section.checks.push(check);
  },

  serialize(section: Section): string[] {
    if (!section.checks) return [];
    const lines: string[] = [];
    for (const check of section.checks) {
      lines.push(`### check: ${check.id}`);
      lines.push(check.question);
      lines.push(`<!-- status: ${check.status} -->`);
      if (check.hints && check.hints.length > 0) {
        lines.push(`<!-- hints: ${JSON.stringify(check.hints)} -->`);
      }
      if (check.answer !== undefined) {
        lines.push(`<!-- answer: ${check.answer} -->`);
      }
      if (check.answerExplanation !== undefined) {
        lines.push(`<!-- explanation: ${check.answerExplanation} -->`);
      }
      lines.push('');
    }
    return lines;
  },

  describe(): BlockFormatDescription {
    return {
      header: '`### check: ID`',
      maxPerSection: 'Unlimited',
      contentFormat: 'Question text, then `<!-- status: unanswered|attempted|revealed -->`',
    };
  },
};
