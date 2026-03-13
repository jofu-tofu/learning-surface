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

export const BEZIER_CONTROL_FACTOR = 0.4;
export const BEZIER_CONTROL_MIN = 20;
export const REROUTE_LABEL_WEIGHT_ENDPOINT = 0.125;
export const REROUTE_LABEL_WEIGHT_ROUTE = 0.75;
/** Lateral CP1 shift for labeled edges — fraction of cross-axis displacement. */
export const LABEL_SPREAD_FACTOR = 0.3;

// --- Port Selection ---

export const FLOW_DIRECTION_BIAS = 0.2;
