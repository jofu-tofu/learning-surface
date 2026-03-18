import type { TimelineData, TimelineEvent } from '../../../shared/schemas.js';
import { parseJsonData } from './shared/parse-utils.js';

// --- Layout Constants ---

const PADDING = 32;
const EVENT_RADIUS = 6;
const EVENT_SPACING_H = 180;
const EVENT_SPACING_V = 80;
const AXIS_OFFSET = 40;
const LABEL_OFFSET = 20;
const DATE_OFFSET = 16;

export const TIMELINE_CONSTANTS = {
  PADDING,
  EVENT_RADIUS,
  EVENT_SPACING_H,
  EVENT_SPACING_V,
  AXIS_OFFSET,
  LABEL_OFFSET,
  DATE_OFFSET,
} as const;

// --- Category Colors ---

const CATEGORY_PALETTE = [
  'var(--color-cat-input-stroke)',
  'var(--color-cat-process-stroke)',
  'var(--color-cat-output-stroke)',
  'var(--color-cat-decision-stroke)',
  'var(--color-cat-concept-stroke)',
  'var(--color-cat-warning-stroke)',
];

function categoryColor(category: string | undefined, categoryIndex: Map<string, number>): string {
  if (!category) return 'var(--color-accent-400)';
  if (!categoryIndex.has(category)) {
    categoryIndex.set(category, categoryIndex.size);
  }
  return CATEGORY_PALETTE[categoryIndex.get(category)! % CATEGORY_PALETTE.length];
}

// --- Positioned Types ---

interface PositionedEvent extends TimelineEvent {
  x: number;
  y: number;
  color: string;
}

interface TimelineLayout {
  events: PositionedEvent[];
  axisStart: { x: number; y: number };
  axisEnd: { x: number; y: number };
  width: number;
  height: number;
  direction: 'horizontal' | 'vertical';
}

// --- Parsing ---

export function parseTimelineData(content: string): TimelineData | null {
  return parseJsonData<TimelineData>(content, (parsed) => {
    const d = parsed as Record<string, unknown>;
    if (!Array.isArray(d.events)) return null;
    for (const event of d.events as Record<string, unknown>[]) {
      if (typeof event.id !== 'string' || typeof event.date !== 'string' || typeof event.label !== 'string') return null;
    }
    return parsed as TimelineData;
  });
}

// --- Layout Computation ---

export function computeTimelineLayout(data: TimelineData): TimelineLayout {
  const direction = data.direction ?? 'horizontal';
  const events = data.events;

  if (events.length === 0) {
    return {
      events: [],
      axisStart: { x: PADDING, y: PADDING },
      axisEnd: { x: PADDING + 100, y: PADDING },
      width: PADDING * 2 + 100,
      height: PADDING * 2,
      direction,
    };
  }

  const categoryIndex = new Map<string, number>();
  const positioned: PositionedEvent[] = [];

  if (direction === 'horizontal') {
    const axisY = PADDING + AXIS_OFFSET;
    const totalWidth = PADDING * 2 + (events.length - 1) * EVENT_SPACING_H;

    for (let i = 0; i < events.length; i++) {
      const x = PADDING + i * EVENT_SPACING_H;
      positioned.push({
        ...events[i],
        x,
        y: axisY,
        color: categoryColor(events[i].category, categoryIndex),
      });
    }

    return {
      events: positioned,
      axisStart: { x: PADDING - 10, y: axisY },
      axisEnd: { x: totalWidth - PADDING + 10, y: axisY },
      width: totalWidth,
      height: axisY + AXIS_OFFSET + PADDING,
      direction,
    };
  }

  // Vertical layout
  const axisX = PADDING + AXIS_OFFSET;
  const totalHeight = PADDING * 2 + (events.length - 1) * EVENT_SPACING_V;

  for (let i = 0; i < events.length; i++) {
    const y = PADDING + i * EVENT_SPACING_V;
    positioned.push({
      ...events[i],
      x: axisX,
      y,
      color: categoryColor(events[i].category, categoryIndex),
    });
  }

  return {
    events: positioned,
    axisStart: { x: axisX, y: PADDING - 10 },
    axisEnd: { x: axisX, y: totalHeight - PADDING + 10 },
    width: axisX + AXIS_OFFSET + PADDING + 200,
    height: totalHeight,
    direction,
  };
}
