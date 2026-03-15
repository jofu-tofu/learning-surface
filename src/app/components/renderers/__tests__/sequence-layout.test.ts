import { describe, it, expect } from 'vitest';
import { parseSequenceData, computeSequenceLayout, SEQUENCE_CONSTANTS } from '../sequence-layout.js';

const { PARTICIPANT_WIDTH, PARTICIPANT_GAP, PADDING, PARTICIPANT_HEIGHT, MESSAGE_SPACING } = SEQUENCE_CONSTANTS;

describe('parseSequenceData', () => {
  it('returns null for non-JSON', () => {
    expect(parseSequenceData('not json')).toBeNull();
  });

  it('returns null when participants is not an array', () => {
    expect(parseSequenceData('{"participants":"string","messages":[]}')).toBeNull();
  });

  it('returns null when messages is not an array', () => {
    expect(parseSequenceData('{"participants":[],"messages":"string"}')).toBeNull();
  });

  it('returns null when participant missing id', () => {
    expect(parseSequenceData(JSON.stringify({
      participants: [{ label: 'no id' }], messages: [],
    }))).toBeNull();
  });

  it('returns null when participant missing label', () => {
    expect(parseSequenceData(JSON.stringify({
      participants: [{ id: 'a' }], messages: [],
    }))).toBeNull();
  });

  it('returns null when message missing from', () => {
    expect(parseSequenceData(JSON.stringify({
      participants: [{ id: 'a', label: 'A' }], messages: [{ to: 'a' }],
    }))).toBeNull();
  });

  it('returns null when message missing to', () => {
    expect(parseSequenceData(JSON.stringify({
      participants: [{ id: 'a', label: 'A' }], messages: [{ from: 'a' }],
    }))).toBeNull();
  });
});

describe('computeSequenceLayout', () => {
  it('returns empty layout for no participants', () => {
    const result = computeSequenceLayout({ participants: [], messages: [] });
    expect(result.participants).toHaveLength(0);
    expect(result.messages).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
  });

  it('positions single participant correctly', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }],
      messages: [],
    });
    expect(result.participants).toHaveLength(1);
    const p = result.participants[0];
    expect(p.x).toBe(PADDING + PARTICIPANT_WIDTH / 2);
    expect(p.y).toBe(PADDING);
    expect(p.width).toBe(PARTICIPANT_WIDTH);
    expect(p.height).toBe(PARTICIPANT_HEIGHT);
  });

  it('skips messages referencing non-existent participants', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }],
      messages: [
        { from: 'a', to: 'missing' },
        { from: 'missing', to: 'a' },
      ],
    });
    expect(result.messages).toHaveLength(0);
  });

  it('handles self-message (from === to) with isSelf true', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }],
      messages: [{ from: 'a', to: 'a' }],
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].isSelf).toBe(true);
    expect(result.messages[0].x1).toBe(result.messages[0].x2);
  });

  it('creates group for contiguous messages with same group value', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      messages: [
        { from: 'a', to: 'b', group: 'auth' },
        { from: 'b', to: 'a', group: 'auth' },
      ],
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].label).toBe('auth');
    expect(result.groups[0].width).toBeGreaterThan(0);
    expect(result.groups[0].height).toBeGreaterThan(0);
  });

  it('creates group even for single message with group', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      messages: [
        { from: 'a', to: 'b', group: 'solo' },
      ],
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].label).toBe('solo');
  });

  it('handles empty messages array with lifelineBottom close to lifelineTop', () => {
    const result = computeSequenceLayout({
      participants: [{ id: 'a', label: 'A' }],
      messages: [],
    });
    expect(result.participants).toHaveLength(1);
    expect(result.lifelineBottom).toBe(result.lifelineTop + MESSAGE_SPACING);
  });
});
