import { describe, it, expect } from 'vitest';
import { parseTimelineData, computeTimelineLayout } from '../timeline-layout.js';

describe('parseTimelineData', () => {
  it('returns null for invalid JSON', () => {
    expect(parseTimelineData('not json')).toBeNull();
  });

  it('returns null when events is not an array', () => {
    expect(parseTimelineData('{"events":"not-array"}')).toBeNull();
  });

  it('returns null when event is missing required fields', () => {
    expect(parseTimelineData('{"events":[{"id":"1"}]}')).toBeNull();
    expect(parseTimelineData('{"events":[{"id":"1","date":"2024"}]}')).toBeNull();
  });
});

describe('computeTimelineLayout', () => {
  it('handles empty events array', () => {
    const layout = computeTimelineLayout({ events: [] });
    expect(layout.events).toEqual([]);
    expect(layout.direction).toBe('horizontal');
    expect(layout.width).toBeGreaterThan(0);
  });

  it('handles single event', () => {
    const layout = computeTimelineLayout({
      events: [{ id: '1', date: '2024', label: 'Start' }],
    });
    expect(layout.events).toHaveLength(1);
    expect(layout.events[0].x).toBeGreaterThan(0);
    expect(layout.events[0].y).toBeGreaterThan(0);
  });

  it('defaults direction to horizontal when missing', () => {
    const layout = computeTimelineLayout({
      events: [{ id: '1', date: '2024', label: 'A' }],
    });
    expect(layout.direction).toBe('horizontal');
  });

  it('respects vertical direction', () => {
    const layout = computeTimelineLayout({
      events: [
        { id: '1', date: '2024', label: 'A' },
        { id: '2', date: '2025', label: 'B' },
      ],
      direction: 'vertical',
    });
    expect(layout.direction).toBe('vertical');
    // Vertical: events share same x, different y
    expect(layout.events[0].x).toBe(layout.events[1].x);
    expect(layout.events[0].y).not.toBe(layout.events[1].y);
  });

  it('assigns colors from palette for categorized events', () => {
    const layout = computeTimelineLayout({
      events: [
        { id: '1', date: '2024', label: 'A', category: 'math' },
        { id: '2', date: '2025', label: 'B', category: 'physics' },
        { id: '3', date: '2026', label: 'C', category: 'math' },
      ],
    });
    // Same category gets same color
    expect(layout.events[0].color).toBe(layout.events[2].color);
    // Different categories get different colors
    expect(layout.events[0].color).not.toBe(layout.events[1].color);
  });
});
