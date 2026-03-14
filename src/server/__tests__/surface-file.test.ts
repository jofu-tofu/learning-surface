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
      activeSection: 'intro',
      sections: [{
        id: 'intro',
        title: 'Introduction',
        canvases: [],
        explanation: 'Hello world',
      }],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.version).toBe(1);
    expect(parsed.activeSection).toBe('intro');
    expect(parsed.sections[0].explanation).toBe('Hello world');
  });

  it('round-trips a document with structured canvas', () => {
    const doc = {
      version: 2,
      activeSection: 'main',
      sections: [{
        id: 'main',
        title: 'Main',
        canvases: [{
          id: 'diagram-1',
          type: 'diagram' as const,
          content: JSON.stringify({ nodes: [{ id: 'a', label: 'A' }], edges: [] }),
        }],
      }],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.sections[0].canvases[0].id).toBe('diagram-1');
    expect(parsed.sections[0].canvases[0].type).toBe('diagram');
  });

  it('round-trips a document with checks and followups', () => {
    const doc = {
      version: 1,
      activeSection: 's1',
      sections: [{
        id: 's1',
        title: 'Section 1',
        canvases: [],
        checks: [{ id: 'c1', question: 'Why?', status: 'unanswered' as const, answer: 'Because.' }],
        followups: ['What about X?', 'Tell me about Y'],
      }],
    };
    const serialized = serializeSurface(doc);
    const parsed = parseSurface(serialized);
    expect(parsed.sections[0].checks![0].question).toBe('Why?');
    expect(parsed.sections[0].followups).toEqual(['What about X?', 'Tell me about Y']);
  });

  it('parseSurface throws on completely invalid JSON', () => {
    expect(() => parseSurface('not json at all {')).toThrow();
  });

  it('parseSurface throws on valid JSON but invalid schema', () => {
    expect(() => parseSurface('{"not": "a surface"}')).toThrow();
  });
});
