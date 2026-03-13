import { describe, it, expect } from 'vitest';
import { sortChatsByRecent, getActiveSection } from '../types.js';
import type { Chat, LearningDocument } from '../types.js';

function makeChat(id: string, updatedAt: string): Chat {
  return { id, title: `Chat ${id}`, createdAt: '2025-01-01T00:00:00Z', updatedAt };
}

function makeDoc(activeSection: string, sectionIds: string[]): LearningDocument {
  return {
    version: 1,
    activeSection,
    sections: sectionIds.map(id => ({ id, title: id })),
  };
}

describe('sortChatsByRecent', () => {
  it('returns empty array for empty input', () => {
    expect(sortChatsByRecent([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const chats = [makeChat('a', '2025-01-01T00:00:00Z')];
    const original = [...chats];
    sortChatsByRecent(chats);
    expect(chats).toEqual(original);
  });

  it('returns most recently updated first', () => {
    const older = makeChat('old', '2025-01-01T00:00:00Z');
    const newer = makeChat('new', '2025-06-15T12:00:00Z');
    expect(sortChatsByRecent([older, newer]).map(c => c.id)).toEqual(['new', 'old']);
  });

  it('handles identical timestamps without crashing', () => {
    const a = makeChat('a', '2025-01-01T00:00:00Z');
    const b = makeChat('b', '2025-01-01T00:00:00Z');
    const result = sortChatsByRecent([a, b]);
    expect(result).toHaveLength(2);
  });
});

describe('getActiveSection', () => {
  it('returns undefined when no section matches activeSection', () => {
    expect(getActiveSection(makeDoc('missing', ['a', 'b']))).toBeUndefined();
  });

  it('returns undefined for empty sections array', () => {
    expect(getActiveSection(makeDoc('any', []))).toBeUndefined();
  });

  it('returns the matching section', () => {
    const doc = makeDoc('b', ['a', 'b', 'c']);
    expect(getActiveSection(doc)?.id).toBe('b');
  });
});
