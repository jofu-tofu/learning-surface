import { describe, it, expect } from 'vitest';
import {
  shouldCreateVersion,
  buildVersionMeta,
} from '../prompt-handler.js';
import { slugify } from '../../shared/slugify.js';

// ═══════════════════════════════════════════════════════════════════════════
// shouldCreateVersion, buildVersionMeta
// ═══════════════════════════════════════════════════════════════════════════

describe('prompt-handler pure functions', () => {
  describe('shouldCreateVersion', () => {
    it('returns false for api mode when same version', () => {
      expect(shouldCreateVersion('api', 1, 1, '', '')).toBe(false);
    });

    it('returns false for cli mode when same content', () => {
      expect(shouldCreateVersion('cli', 1, 1, 'same', 'same')).toBe(false);
    });
  });

  describe('buildVersionMeta', () => {
    it('handles null summary', () => {
      const meta = buildVersionMeta('prompt', null, '2026-01-01T00:00:00Z');
      expect(meta.summary).toBeNull();
      expect(meta.prompt).toBe('prompt');
      expect(meta.source).toBe('ai');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// slugify
// ═══════════════════════════════════════════════════════════════════════════

describe('slugify', () => {
  it('special chars: What is TCP? → what-is-tcp', () => {
    expect(slugify('What is TCP?')).toBe('what-is-tcp');
  });

  it('multiple spaces: a  b   c → a-b-c', () => {
    expect(slugify('a  b   c')).toBe('a-b-c');
  });

  it('leading/trailing: " -hello- " → hello', () => {
    expect(slugify(' -hello- ')).toBe('hello');
  });

  it('already slugified: hello-world → hello-world', () => {
    expect(slugify('hello-world')).toBe('hello-world');
  });

  it('accented: decomposes diacriticals (e.g., café → cafe)', () => {
    expect(slugify('café')).toBe('cafe');
  });

  it('non-Latin: preserves CJK characters', () => {
    expect(slugify('学习')).toBe('学习');
  });

  it('all-symbol input: falls back to untitled', () => {
    expect(slugify('!@#$%')).toBe('untitled');
  });

  it('empty string: falls back to untitled', () => {
    expect(slugify('')).toBe('untitled');
  });
});
