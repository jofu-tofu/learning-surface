import { describe, it, expect } from 'vitest';
import { checkBlock } from '../blocks/check.js';
import { followupsBlock } from '../blocks/followups.js';
import { buildSection } from '../../test/helpers.js';

describe('checkBlock', () => {
  describe('match', () => {
    it('returns null for non-check headers', () => {
      expect(checkBlock.match('### explanation')).toBeNull();
      expect(checkBlock.match('### followups')).toBeNull();
      expect(checkBlock.match('## check: c1')).toBeNull();
    });

    it('matches valid check headers', () => {
      expect(checkBlock.match('### check: c1')).not.toBeNull();
      expect(checkBlock.match('### check: my-check-id')).not.toBeNull();
    });
  });

  describe('parse', () => {
    it('extracts question and status from content', () => {
      const section = buildSection();
      checkBlock.parse(
        '### check: c1',
        'What is recursion?\n<!-- status: attempted -->',
        section,
      );
      expect(section.checks).toHaveLength(1);
      expect(section.checks![0]).toMatchObject({
        id: 'c1',
        question: 'What is recursion?',
        status: 'attempted',
      });
    });

    it('defaults status to unanswered when not specified', () => {
      const section = buildSection();
      checkBlock.parse('### check: c1', 'Some question?', section);
      expect(section.checks![0].status).toBe('unanswered');
    });

    it('extracts hints when present as JSON comment', () => {
      const section = buildSection();
      checkBlock.parse(
        '### check: c1',
        'Question?\n<!-- status: unanswered -->\n<!-- hints: ["h1","h2"] -->',
        section,
      );
      expect(section.checks![0].hints).toEqual(['h1', 'h2']);
    });

    it('handles malformed hints JSON gracefully', () => {
      const section = buildSection();
      expect(() =>
        checkBlock.parse(
          '### check: c1',
          'Question?\n<!-- hints: [not valid json -->',
          section,
        ),
      ).not.toThrow();
      expect(section.checks![0].hints).toBeUndefined();
    });

    it('extracts answer and answerExplanation comments', () => {
      const section = buildSection();
      checkBlock.parse(
        '### check: c1',
        [
          'Why?',
          '<!-- status: revealed -->',
          '<!-- answer: Because of X -->',
          '<!-- explanation: X happens when Y -->',
        ].join('\n'),
        section,
      );
      expect(section.checks![0].answer).toBe('Because of X');
      expect(section.checks![0].answerExplanation).toBe('X happens when Y');
    });
  });

  describe('serialize', () => {
    it('returns empty array when section has no checks', () => {
      const section = buildSection();
      expect(checkBlock.serialize(section)).toEqual([]);
    });

    it('includes hints/answer/answerExplanation when present', () => {
      const section = buildSection({
        checks: [{
          id: 'c1',
          question: 'Q?',
          status: 'revealed',
          hints: ['hint1', 'hint2'],
          answer: 'A',
          answerExplanation: 'Because',
        }],
      });
      const lines = checkBlock.serialize(section);
      expect(lines).toContain('<!-- hints: ["hint1","hint2"] -->');
      expect(lines).toContain('<!-- answer: "A" -->');
      expect(lines).toContain('<!-- explanation: "Because" -->');
    });

    it('round-trips through serialize then parse', () => {
      const original = buildSection({
        checks: [
          {
            id: 'c1',
            question: 'What is X?',
            status: 'attempted',
            hints: ['try this'],
            answer: 'X is Y',
            answerExplanation: 'Y because Z',
          },
          {
            id: 'c2',
            question: 'Why?',
            status: 'unanswered',
          },
        ],
      });

      const lines = checkBlock.serialize(original);
      const restored = buildSection();

      // Re-parse each serialized check block
      let i = 0;
      while (i < lines.length) {
        const header = lines[i];
        if (checkBlock.match(header)) {
          const contentLines: string[] = [];
          i++;
          while (i < lines.length && !checkBlock.match(lines[i])) {
            contentLines.push(lines[i]);
            i++;
          }
          checkBlock.parse(header, contentLines.join('\n'), restored);
        } else {
          i++;
        }
      }

      expect(restored.checks).toEqual(original.checks);
    });
  });
});

describe('followupsBlock', () => {
  describe('match', () => {
    it('returns null for non-followups headers', () => {
      expect(followupsBlock.match('### explanation')).toBeNull();
      expect(followupsBlock.match('### check: c1')).toBeNull();
      expect(followupsBlock.match('### followups extra')).toBeNull();
    });

    it('matches valid followups header', () => {
      expect(followupsBlock.match('### followups')).not.toBeNull();
    });
  });

  describe('parse', () => {
    it('extracts list items from markdown list', () => {
      const section = buildSection();
      followupsBlock.parse(
        '### followups',
        '- Learn about X\n- Try Y\n- Explore Z',
        section,
      );
      expect(section.followups).toEqual(['Learn about X', 'Try Y', 'Explore Z']);
    });

    it('ignores non-list lines', () => {
      const section = buildSection();
      followupsBlock.parse(
        '### followups',
        'Some preamble\n- Actual item\nAnother line\n- Second item',
        section,
      );
      expect(section.followups).toEqual(['Actual item', 'Second item']);
    });
  });

  describe('serialize', () => {
    it('returns empty array when section has no followups', () => {
      const section = buildSection();
      expect(followupsBlock.serialize(section)).toEqual([]);
    });

    it('round-trips through serialize then parse', () => {
      const original = buildSection({
        followups: ['Dig into A', 'Research B', 'Compare with C'],
      });

      const lines = followupsBlock.serialize(original);
      const restored = buildSection();

      // Skip the header line, feed remaining as content
      const content = lines.slice(1).join('\n');
      followupsBlock.parse('### followups', content, restored);

      expect(restored.followups).toEqual(original.followups);
    });
  });
});
