import { describe, it, expect } from 'vitest';
import { sanitizeJsonControlChars, parseSurface, serializeSurface } from '../surface-file.js';

describe('sanitizeJsonControlChars', () => {
  it('returns valid JSON unchanged', () => {
    const valid = '{"key": "value"}';
    expect(sanitizeJsonControlChars(valid)).toBe(valid);
  });

  it('escapes literal newline inside a JSON string value', () => {
    const raw = '{"key": "line1\nline2"}';
    const sanitized = sanitizeJsonControlChars(raw);
    expect(() => JSON.parse(sanitized)).not.toThrow();
    expect(JSON.parse(sanitized).key).toBe('line1\nline2');
  });

  it('escapes literal tab inside a JSON string value', () => {
    const raw = '{"key": "col1\tcol2"}';
    const sanitized = sanitizeJsonControlChars(raw);
    expect(() => JSON.parse(sanitized)).not.toThrow();
  });

  it('preserves already-escaped sequences', () => {
    const raw = '{"key": "already\\nescaped"}';
    const sanitized = sanitizeJsonControlChars(raw);
    expect(JSON.parse(sanitized).key).toBe('already\nescaped');
  });

  it('handles empty string input', () => {
    expect(sanitizeJsonControlChars('')).toBe('');
  });

  it('does not modify content outside of string values', () => {
    const raw = '{\n  "key": "value"\n}';
    expect(sanitizeJsonControlChars(raw)).toBe(raw);
  });
});

describe('parseSurface + serializeSurface round-trip', () => {
  it('round-trips a minimal document', () => {
    const doc = {
      version: 1,
      canvases: [],
      blocks: [{ id: 'b1', type: 'text' as const, content: 'Hello world' }],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.version).toBe(1);
    expect(parsed.blocks[0]).toMatchObject({ type: 'text', content: 'Hello world' });
  });

  it('round-trips a document with structured canvas', () => {
    const doc = {
      version: 2,
      canvases: [{
        id: 'diagram-1',
        type: 'diagram' as const,
        content: JSON.stringify({ nodes: [{ id: 'a', label: 'A' }], edges: [] }),
      }],
      blocks: [],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.canvases[0].id).toBe('diagram-1');
    expect(parsed.canvases[0].type).toBe('diagram');
  });

  it('round-trips a document with all block types', () => {
    const doc = {
      version: 1,
      canvases: [],
      blocks: [
        { id: 'b1', type: 'text' as const, content: 'Hello' },
        { id: 'b2', type: 'interactive' as const, prompt: 'Why?', response: null },
        { id: 'b3', type: 'feedback' as const, targetBlockId: 'b2', correct: true, content: 'Because.' },
        { id: 'b4', type: 'deeper-patterns' as const, patterns: [{ pattern: 'P', connection: 'C' }] },
        { id: 'b5', type: 'suggestions' as const, items: ['Next?'] },
      ],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.blocks).toHaveLength(5);
    expect(parsed.blocks[2]).toMatchObject({ type: 'feedback', correct: true });
  });

  it('parseSurface throws on completely invalid JSON', () => {
    expect(() => parseSurface('not json at all {')).toThrow();
  });

  it('parseSurface throws on valid JSON but invalid schema', () => {
    expect(() => parseSurface('{"not": "a surface"}')).toThrow();
  });
});
