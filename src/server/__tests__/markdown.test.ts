import { describe, it, expect } from 'vitest';
import { parse, serialize, applyToolCall } from '../markdown.js';
import {
  MINIMAL_DOC,
  FULL_DOC,
  NO_FRONTMATTER_DOC,
  EMPTY_SECTION_DOC,
  UNKNOWN_BLOCK_DOC,
  DUPLICATE_BLOCK_DOC,
  buildDocument,
  buildSection,
  buildCanvasContent,
  buildCheck,
} from '../../test/helpers.js';

describe('parse()', () => {
  it('returns sections with canvas content from a full document', () => {
    const doc = parse(FULL_DOC);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].canvas).toBeDefined();
    expect(doc.sections[0].canvas!.type).toBe('mermaid');
    expect(doc.sections[0].canvas!.content).toContain('graph LR');
  });

  it('extracts frontmatter version and activeSection', () => {
    const doc = parse(FULL_DOC);
    expect(doc.version).toBe(3);
    expect(doc.activeSection).toBe('the-three-way-handshake');
  });

  it('parses section titles and slugified IDs', () => {
    const doc = parse(FULL_DOC);
    expect(doc.sections[0].title).toBe('What is TCP?');
    expect(doc.sections[0].id).toBe('what-is-tcp');
    expect(doc.sections[1].title).toBe('The Three-Way Handshake');
    expect(doc.sections[1].id).toBe('the-three-way-handshake');
  });

  it('parses section status from status comments', () => {
    const doc = parse(FULL_DOC);
    expect(doc.sections[0].status).toBe('completed');
    expect(doc.sections[1].status).toBe('active');
  });

  it('parses explanation blocks', () => {
    const doc = parse(FULL_DOC);
    expect(doc.sections[0].explanation).toContain('connection-oriented protocol');
  });

  it('parses check blocks with id, question, and status', () => {
    const doc = parse(FULL_DOC);
    const checks = doc.sections[1].checks;
    expect(checks).toHaveLength(1);
    expect(checks![0].id).toBe('c1');
    expect(checks![0].question).toContain('Why three steps');
    expect(checks![0].status).toBe('unanswered');
  });

  it('parses followups as string array', () => {
    const doc = parse(FULL_DOC);
    const followups = doc.sections[1].followups;
    expect(followups).toHaveLength(2);
    expect(followups).toContain('What is a SYN packet?');
    expect(followups).toContain('TCP vs UDP');
  });

  it('handles section with no blocks as valid empty section', () => {
    const doc = parse(EMPTY_SECTION_DOC);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].title).toBe('Empty');
    expect(doc.sections[0].canvas).toBeUndefined();
    expect(doc.sections[0].explanation).toBeUndefined();
  });

  it('throws error when frontmatter is missing', () => {
    expect(() => parse(NO_FRONTMATTER_DOC)).toThrow(/frontmatter/i);
  });

  it('preserves unknown block types for round-trip', () => {
    const doc = parse(UNKNOWN_BLOCK_DOC);
    const reserialized = serialize(doc);
    expect(reserialized).toContain('unknown_block');
    expect(reserialized).toContain('Some content here.');
  });

  it('uses last block when duplicate block types appear in a section', () => {
    const doc = parse(DUPLICATE_BLOCK_DOC);
    expect(doc.sections[0].explanation).toBe('Second explanation.');
  });

  it('parses minimal document correctly', () => {
    const doc = parse(MINIMAL_DOC);
    expect(doc.version).toBe(1);
    expect(doc.activeSection).toBe('introduction');
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].explanation).toContain('This is the introduction.');
  });
});

describe('serialize()', () => {
  it('produces valid markdown string from a LearningDocument', () => {
    const doc = buildDocument({
      version: 2,
      sections: [
        buildSection({
          title: 'My Section',
          status: 'active',
          canvas: buildCanvasContent({ type: 'mermaid', content: 'graph TD\n  A --> B' }),
          explanation: 'Some explanation text.',
          checks: [buildCheck({ id: 'q1', question: 'What happens next?' })],
          followups: ['Follow-up 1', 'Follow-up 2'],
        }),
      ],
    });
    const md = serialize(doc);
    expect(md).toContain('version: 2');
    expect(md).toContain('## My Section');
    expect(md).toContain('### canvas: mermaid');
    expect(md).toContain('graph TD');
    expect(md).toContain('### explanation');
    expect(md).toContain('Some explanation text.');
    expect(md).toContain('### check: q1');
    expect(md).toContain('What happens next?');
    expect(md).toContain('### followups');
    expect(md).toContain('- Follow-up 1');
  });

  it('includes frontmatter with version and active_section', () => {
    const doc = buildDocument({ version: 5 });
    const md = serialize(doc);
    expect(md).toContain('---');
    expect(md).toContain('version: 5');
    expect(md).toContain('active_section:');
  });

  it('includes status comments for sections', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Done', status: 'completed' })],
    });
    const md = serialize(doc);
    expect(md).toContain('<!-- status: completed -->');
  });
});

describe('round-trip: serialize(parse(raw))', () => {
  it('preserves content for a full document', () => {
    const doc = parse(FULL_DOC);
    const reserialized = serialize(doc);
    const reparsed = parse(reserialized);

    expect(reparsed.version).toBe(doc.version);
    expect(reparsed.activeSection).toBe(doc.activeSection);
    expect(reparsed.sections).toHaveLength(doc.sections.length);

    for (let i = 0; i < doc.sections.length; i++) {
      expect(reparsed.sections[i].title).toBe(doc.sections[i].title);
      expect(reparsed.sections[i].status).toBe(doc.sections[i].status);
      expect(reparsed.sections[i].canvas?.type).toBe(doc.sections[i].canvas?.type);
      expect(reparsed.sections[i].canvas?.content).toBe(doc.sections[i].canvas?.content);
      expect(reparsed.sections[i].explanation).toBe(doc.sections[i].explanation);
      expect(reparsed.sections[i].checks?.length).toBe(doc.sections[i].checks?.length);
      expect(reparsed.sections[i].followups).toEqual(doc.sections[i].followups);
    }
  });

  it('preserves content for a minimal document', () => {
    const doc = parse(MINIMAL_DOC);
    const reparsed = parse(serialize(doc));
    expect(reparsed.sections[0].explanation).toBe(doc.sections[0].explanation);
  });
});

describe('applyToolCall()', () => {
  it('new_section adds a new section scaffold', () => {
    const doc = buildDocument();
    const result = applyToolCall(doc, 'new_section', { title: 'New Topic' });
    expect(result.sections).toHaveLength(2);
    expect(result.sections[1].title).toBe('New Topic');
    expect(result.sections[1].id).toBe('new-topic');
    expect(result.sections[1].status).toBe('active');
  });

  it('show_visual sets canvas on the active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro' })],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'show_visual', {
      type: 'mermaid',
      content: 'graph TD\n  X --> Y',
    });
    const active = result.sections.find((s) => s.id === result.activeSection);
    expect(active?.canvas?.type).toBe('mermaid');
    expect(active?.canvas?.content).toContain('X --> Y');
  });

  it('explain sets explanation on the active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro' })],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'explain', {
      content: 'This is an explanation.',
    });
    const active = result.sections.find((s) => s.id === result.activeSection);
    expect(active?.explanation).toBe('This is an explanation.');
  });

  it('extend appends to explanation', () => {
    const doc = buildDocument({
      sections: [
        buildSection({
          title: 'Intro',
          explanation: 'First part.',
        }),
      ],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'extend', {
      content: ' Second part.',
    });
    const active = result.sections.find((s) => s.id === result.activeSection);
    expect(active?.explanation).toContain('First part.');
    expect(active?.explanation).toContain('Second part.');
  });

  it('challenge adds a check to the active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro' })],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'challenge', {
      question: 'What is the answer?',
      hints: ['Think about it'],
    });
    const active = result.sections.find((s) => s.id === result.activeSection);
    expect(active?.checks).toHaveLength(1);
    expect(active?.checks![0].question).toBe('What is the answer?');
    expect(active?.checks![0].hints).toContain('Think about it');
    expect(active?.checks![0].status).toBe('unanswered');
  });

  it('challenge hints survive serialize→parse round-trip', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro' })],
      activeSection: 'intro',
    });
    const after = applyToolCall(doc, 'challenge', {
      question: 'Why?',
      hints: ['Hint one', 'Hint two'],
    });
    const roundTripped = parse(serialize(after));
    const check = roundTripped.sections[0].checks![0];
    expect(check.hints).toEqual(['Hint one', 'Hint two']);
  });

  it('reveal answer survives serialize→parse round-trip', () => {
    const doc = buildDocument({
      sections: [buildSection({
        title: 'Intro',
        checks: [buildCheck({ id: 'c1', question: 'Why?', status: 'unanswered' })],
      })],
      activeSection: 'intro',
    });
    const after = applyToolCall(doc, 'reveal', {
      checkId: 'c1',
      answer: 'Because reasons.',
      explanation: 'Detailed reasoning here.',
    });
    const roundTripped = parse(serialize(after));
    const check = roundTripped.sections[0].checks![0];
    expect(check.status).toBe('revealed');
    expect(check.answer).toBe('Because reasons.');
    expect(check.answerExplanation).toBe('Detailed reasoning here.');
  });

  it('suggest_followups sets followups on the active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro' })],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'suggest_followups', {
      questions: ['What next?', 'Why?'],
    });
    const active = result.sections.find((s) => s.id === result.activeSection);
    expect(active?.followups).toEqual(['What next?', 'Why?']);
  });

  it('complete_section changes section status to completed', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Intro', status: 'active' })],
      activeSection: 'intro',
    });
    const result = applyToolCall(doc, 'complete_section', { section: 'intro' });
    expect(result.sections[0].status).toBe('completed');
  });

  it('set_active changes activeSection', () => {
    const doc = buildDocument({
      sections: [
        buildSection({ title: 'First', status: 'completed' }),
        buildSection({ title: 'Second', status: 'active' }),
      ],
      activeSection: 'first',
    });
    const result = applyToolCall(doc, 'set_active', { section: 'second' });
    expect(result.activeSection).toBe('second');
  });

  describe('clear', () => {
    it('clears canvas from the active section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Intro', canvas: buildCanvasContent() })],
        activeSection: 'intro',
      });
      const result = applyToolCall(doc, 'clear', { target: 'canvas' });
      const active = result.sections.find(s => s.id === 'intro');
      expect(active?.canvas).toBeUndefined();
    });

    it('clears explanation from the active section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Intro', explanation: 'Some text.' })],
        activeSection: 'intro',
      });
      const result = applyToolCall(doc, 'clear', { target: 'explanation' });
      const active = result.sections.find(s => s.id === 'intro');
      expect(active?.explanation).toBeUndefined();
    });

    it('clears checks from the active section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Intro', checks: [buildCheck()] })],
        activeSection: 'intro',
      });
      const result = applyToolCall(doc, 'clear', { target: 'checks' });
      const active = result.sections.find(s => s.id === 'intro');
      expect(active?.checks).toBeUndefined();
    });

    it('clears followups from the active section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Intro', followups: ['Q1', 'Q2'] })],
        activeSection: 'intro',
      });
      const result = applyToolCall(doc, 'clear', { target: 'followups' });
      const active = result.sections.find(s => s.id === 'intro');
      expect(active?.followups).toBeUndefined();
    });

    it('removes a section by id', () => {
      const doc = buildDocument({
        sections: [
          buildSection({ title: 'First' }),
          buildSection({ title: 'Second' }),
        ],
        activeSection: 'second',
      });
      const result = applyToolCall(doc, 'clear', { target: 'section', section: 'first' });
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe('second');
      expect(result.activeSection).toBe('second');
    });

    it('removes the active section and falls back to the last remaining', () => {
      const doc = buildDocument({
        sections: [
          buildSection({ title: 'First' }),
          buildSection({ title: 'Second' }),
        ],
        activeSection: 'first',
      });
      const result = applyToolCall(doc, 'clear', { target: 'section' });
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe('second');
      expect(result.activeSection).toBe('second');
    });

    it('targets a specific section when section param is provided', () => {
      const doc = buildDocument({
        sections: [
          buildSection({ title: 'First', canvas: buildCanvasContent() }),
          buildSection({ title: 'Second', canvas: buildCanvasContent() }),
        ],
        activeSection: 'first',
      });
      const result = applyToolCall(doc, 'clear', { target: 'canvas', section: 'second' });
      expect(result.sections.find(s => s.id === 'first')?.canvas).toBeDefined();
      expect(result.sections.find(s => s.id === 'second')?.canvas).toBeUndefined();
    });

    it('is a no-op when targeting a nonexistent section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Intro', canvas: buildCanvasContent() })],
        activeSection: 'intro',
      });
      const result = applyToolCall(doc, 'clear', { target: 'canvas', section: 'nonexistent' });
      expect(result.sections[0].canvas).toBeDefined();
    });

    it('refuses to remove the last section', () => {
      const doc = buildDocument({
        sections: [buildSection({ title: 'Only' })],
        activeSection: 'only',
      });
      const result = applyToolCall(doc, 'clear', { target: 'section' });
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe('only');
    });

    it('wipes entire document with target "all"', () => {
      const doc = buildDocument({
        sections: [
          buildSection({ title: 'First', canvas: buildCanvasContent(), explanation: 'text' }),
          buildSection({ title: 'Second', checks: [buildCheck()] }),
        ],
        activeSection: 'second',
      });
      doc.summary = 'Old summary';
      const result = applyToolCall(doc, 'clear', { target: 'all' });
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe('start');
      expect(result.sections[0].title).toBe('Start');
      expect(result.sections[0].status).toBe('active');
      expect(result.activeSection).toBe('start');
      expect(result.summary).toBeUndefined();
    });
  });
});
