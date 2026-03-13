import { describe, it, expect } from 'vitest';
import {
  diamondPoints,
  ellipseGeometry,
  computeGlowRect,
  computeTooltipPosition,
  computeSvgFitStyle,
  nodeTransition,
  edgeTransition,
  nodeOpacity,
  nodeLabelX,
  controlPointOffset,
  shapeCornerRadius,
} from '../diagram-layout.js';

// ---------------------------------------------------------------------------
// shapeCornerRadius — shape -> radius mapping
// ---------------------------------------------------------------------------

describe('shapeCornerRadius', () => {
  it('returns smaller radius for rectangle than for rounded shapes', () => {
    const rect = shapeCornerRadius('rectangle');
    const rounded = shapeCornerRadius('rounded');
    expect(rect).toBeLessThan(rounded);
  });

  it('returns same radius for all non-rectangle shapes', () => {
    const rounded = shapeCornerRadius('rounded');
    expect(shapeCornerRadius('diamond')).toBe(rounded);
    expect(shapeCornerRadius('circle')).toBe(rounded);
  });
});

// ---------------------------------------------------------------------------
// diamondPoints — SVG polygon points
// ---------------------------------------------------------------------------

describe('diamondPoints', () => {
  it('collapses to a single point when dimensions equal double the inset', () => {
    const pts = diamondPoints(2, 2, 1);
    expect(pts).toBe('1,1 1,1 1,1 1,1');
  });

  it('touches all four edges with zero inset', () => {
    const pts = diamondPoints(100, 50, 0);
    // Top (50,0), Right (100,25), Bottom (50,50), Left (0,25)
    expect(pts).toBe('50,0 100,25 50,50 0,25');
  });

  it('default inset matches explicit SHAPE_INSET=1', () => {
    // Verifying default parameter by comparing with explicit value
    expect(diamondPoints(100, 50)).toBe(diamondPoints(100, 50, 1));
  });
});

// ---------------------------------------------------------------------------
// ellipseGeometry — center + radii
// ---------------------------------------------------------------------------

describe('ellipseGeometry', () => {
  it('produces zero rx when inset equals half the width', () => {
    const g = ellipseGeometry(20, 10, 10);
    expect(g.rx).toBe(0);
  });

  it('produces negative radii when inset exceeds half dimensions', () => {
    const g = ellipseGeometry(10, 10, 10);
    expect(g.rx).toBeLessThan(0);
    expect(g.ry).toBeLessThan(0);
  });

  it('center is always at half dimensions regardless of inset', () => {
    const g = ellipseGeometry(100, 50, 20);
    expect(g.cx).toBe(50);
    expect(g.cy).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// computeGlowRect — highlight bounding box
// ---------------------------------------------------------------------------

describe('computeGlowRect', () => {
  it('zero padding produces rect at origin with node dimensions', () => {
    const r = computeGlowRect(160, 44, 'rectangle', 0);
    expect(r.width).toBe(160);
    expect(r.height).toBe(44);
  });

  it('rx is always larger than base shape radius when padding > 0', () => {
    const baseRx = shapeCornerRadius('rectangle');
    const r = computeGlowRect(160, 44, 'rectangle', 8);
    expect(r.rx).toBeGreaterThan(baseRx);
  });
});

// ---------------------------------------------------------------------------
// computeTooltipPosition — clamped tooltip placement
// ---------------------------------------------------------------------------

describe('computeTooltipPosition', () => {
  it('clamps to left edge when x is at origin', () => {
    const pos = computeTooltipPosition(0, 100, 1000);
    expect(pos.x).toBe(4); // TOOLTIP_EDGE_PADDING
  });

  it('clamps to right edge when x is at SVG width', () => {
    const pos = computeTooltipPosition(1000, 100, 1000);
    expect(pos.x).toBe(796); // 1000 - 200 - 4
  });

  it('right clamp wins in SVG narrower than tooltip width', () => {
    // SVG=100 is narrower than maxWidth=200 + 2*edgePad=8
    // Right clamp = 100-200-4 = -104, left clamp = 4
    // Math.min(4, -104) => right clamp wins, producing negative x
    const pos = computeTooltipPosition(50, 100, 100);
    expect(pos.x).toBeLessThan(0);
  });

  it('y is always offset above the target point', () => {
    const pos = computeTooltipPosition(500, 200, 1000);
    expect(pos.y).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// computeSvgFitStyle — aspect-ratio fitting
// ---------------------------------------------------------------------------

describe('computeSvgFitStyle', () => {
  it('falls back to width-fit when container dimensions are undefined', () => {
    const style = computeSvgFitStyle(800, 600, undefined, undefined);
    expect(style.width).toBe('100%');
    expect(style.height).toBe('auto');
  });

  it('falls back to width-fit when container dimensions are zero', () => {
    const style = computeSvgFitStyle(800, 600, 0, 0);
    expect(style.width).toBe('100%');
  });

  it('width-constrained when diagram aspect exceeds container aspect', () => {
    // diagram 800x200 (aspect 4) in container 400x600 (aspect 0.67)
    const style = computeSvgFitStyle(800, 200, 400, 600);
    expect(style.width).toBe('100%');
    expect(style.height).toBe('auto');
  });

  it('height-constrained when container aspect exceeds diagram aspect', () => {
    // diagram 200x800 (aspect 0.25) in container 600x400 (aspect 1.5)
    const style = computeSvgFitStyle(200, 800, 600, 400);
    expect(style.height).toBe('100%');
    expect(style.maxWidth).toBe('100%');
  });

  it('falls back when only one container dimension is provided', () => {
    const style = computeSvgFitStyle(800, 600, 500, undefined);
    expect(style.width).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// nodeTransition / edgeTransition — animation timing strings
// ---------------------------------------------------------------------------

describe('nodeTransition', () => {
  it('index 0 produces zero delay', () => {
    expect(nodeTransition(0)).toBe('opacity 0.4s ease 0s');
  });

  it('index 1 produces nonzero delay', () => {
    expect(nodeTransition(1)).toBe('opacity 0.4s ease 0.05s');
  });
});

describe('edgeTransition', () => {
  it('index 0 has nonzero base delay (edges start after nodes)', () => {
    expect(edgeTransition(0)).toBe('opacity 0.4s ease 0.1s');
  });

  it('index 1 adds stagger to base delay', () => {
    expect(edgeTransition(1)).toBe('opacity 0.4s ease 0.13s');
  });
});

// ---------------------------------------------------------------------------
// nodeOpacity — mount state + emphasis
// ---------------------------------------------------------------------------

describe('nodeOpacity', () => {
  it('returns 0 when not mounted, regardless of emphasis', () => {
    expect(nodeOpacity(false, 'highlighted')).toBe(0);
    expect(nodeOpacity(false, 'dimmed')).toBe(0);
    expect(nodeOpacity(false, undefined)).toBe(0);
  });

  it('returns reduced opacity when mounted and dimmed', () => {
    const opacity = nodeOpacity(true, 'dimmed');
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  it('treats undefined emphasis as full opacity', () => {
    expect(nodeOpacity(true, undefined)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// nodeLabelX — text offset for category dot
// ---------------------------------------------------------------------------

describe('nodeLabelX', () => {
  it('shifts right when category dot is present', () => {
    const withoutCategory = nodeLabelX(160, false);
    const withCategory = nodeLabelX(160, true);
    expect(withCategory).toBeGreaterThan(withoutCategory);
  });
});

// ---------------------------------------------------------------------------
// controlPointOffset — Bézier curvature
// ---------------------------------------------------------------------------

describe('controlPointOffset', () => {
  it('clamps to minimum for zero distance', () => {
    expect(controlPointOffset(0)).toBe(20); // BEZIER_CONTROL_MIN
  });

  it('clamps to minimum for small distances', () => {
    // 49 * 0.4 = 19.6 < 20 (min), so clamps
    expect(controlPointOffset(49)).toBe(20);
  });

  it('exceeds minimum for large distances', () => {
    expect(controlPointOffset(200)).toBeGreaterThan(20);
  });

  it('treats negative distance same as positive (absolute value)', () => {
    expect(controlPointOffset(-200)).toBe(controlPointOffset(200));
  });
});
