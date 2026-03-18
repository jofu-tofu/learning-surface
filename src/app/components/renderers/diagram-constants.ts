/**
 * Shared constants for diagram layout and overlap resolution.
 *
 * Extracted so both diagram-layout.ts and overlap-resolution.ts can import
 * without creating a circular dependency (diagram-layout imports from
 * overlap-resolution).
 */

// --- Node Dimensions ---

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 44;
export const HORIZONTAL_GAP = 48;

// --- Edge Label Dimensions ---

export const EDGE_LABEL_CHAR_WIDTH = 7;
export const EDGE_LABEL_PADDING = 16;
export const EDGE_LABEL_HEIGHT = 20;
export const EDGE_LABEL_TEXT_OFFSET_Y = 4;

// --- Bezier Curve Constants ---

const BEZIER_CONTROL_FACTOR = 0.4;
const BEZIER_CONTROL_MIN = 20;
export const REROUTE_LABEL_WEIGHT_ENDPOINT = 0.125;
export const REROUTE_LABEL_WEIGHT_ROUTE = 0.75;
/** Lateral CP1 shift for labeled edges — fraction of cross-axis displacement. */
export const LABEL_SPREAD_FACTOR = 0.3;

// --- Port Selection ---

export const FLOW_DIRECTION_BIAS = 0.2;

// --- Arrow Marker Constants ---

export const ARROW_VIEWBOX = '0 0 10 8';
export const ARROW_REF_X = 9;
export const ARROW_REF_Y = 4;
export const ARROW_WIDTH = 8;
export const ARROW_HEIGHT = 6;
export const ARROW_PATH = 'M 0 0 L 10 4 L 0 8 Z';

// --- Shape Constants ---

export const RECT_CORNER_RADIUS = 4;
export const ROUNDED_CORNER_RADIUS = 12;
export const SHAPE_STROKE_WIDTH = 1.5;

// --- Animation Constants ---

export const ANIMATION_DURATION = 0.4;
export const NODE_STAGGER_DELAY = 0.05;
export const EDGE_BASE_DELAY = 0.1;
export const EDGE_STAGGER_DELAY = 0.03;
export const DIMMED_OPACITY = 0.4;

// --- Shared Bezier Helpers ---

/** Compute Bezier control point offset from distance between endpoints. */
export function controlPointOffset(distance: number): number {
  return Math.max(Math.abs(distance) * BEZIER_CONTROL_FACTOR, BEZIER_CONTROL_MIN);
}
