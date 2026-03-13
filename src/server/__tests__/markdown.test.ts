import { describe, it, expect } from 'vitest';
import { parse, serialize, applyToolCall } from '../markdown.js';
import {
  NO_FRONTMATTER_DOC,
  EMPTY_SECTION_DOC,
  UNKNOWN_BLOCK_DOC,
  DUPLICATE_BLOCK_DOC,
  buildDocument,
  buildSection,
  buildCanvasContent,
} from '../../test/helpers.js';

describe('parse()', () => {
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
});

describe('applyToolCall()', () => {
  describe('clear', () => {
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
  });
});
