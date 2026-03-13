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
  portPosition,
  selectPorts,
  cubicBezierPoint,
  edgeLabelOnCurve,
  computeLayerGaps,
  countCrossings,
  minimizeCrossings,
  NODE_WIDTH,
  NODE_HEIGHT,
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

// ---------------------------------------------------------------------------
// portPosition — boundary point for each port
// ---------------------------------------------------------------------------

describe('portPosition', () => {
  it('top port is at center-x and node top', () => {
    const pos = portPosition(100, 50, 'top');
    expect(pos.x).toBe(100 + NODE_WIDTH / 2);
    expect(pos.y).toBe(50);
  });

  it('bottom port is at center-x and node bottom', () => {
    const pos = portPosition(100, 50, 'bottom');
    expect(pos.x).toBe(100 + NODE_WIDTH / 2);
    expect(pos.y).toBe(50 + NODE_HEIGHT);
  });

  it('left port is at node left and center-y', () => {
    const pos = portPosition(100, 50, 'left');
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(50 + NODE_HEIGHT / 2);
  });

  it('right port is at node right and center-y', () => {
    const pos = portPosition(100, 50, 'right');
    expect(pos.x).toBe(100 + NODE_WIDTH);
    expect(pos.y).toBe(50 + NODE_HEIGHT / 2);
  });
});

// ---------------------------------------------------------------------------
// selectPorts — smart port selection based on relative position
// ---------------------------------------------------------------------------

describe('selectPorts', () => {
  it('chooses bottom/top when target is directly below (TB)', () => {
    const result = selectPorts({ x: 100, y: 50 }, { x: 100, y: 200 }, 'TB');
    expect(result).toEqual({ fromPort: 'bottom', toPort: 'top' });
  });

  it('chooses top/bottom when target is directly above (TB)', () => {
    const result = selectPorts({ x: 100, y: 200 }, { x: 100, y: 50 }, 'TB');
    expect(result).toEqual({ fromPort: 'top', toPort: 'bottom' });
  });

  it('chooses right/left when target is far to the right (TB)', () => {
    // Same y, big x difference — horizontal connection
    const result = selectPorts({ x: 50, y: 100 }, { x: 500, y: 100 }, 'TB');
    expect(result).toEqual({ fromPort: 'right', toPort: 'left' });
  });

  it('chooses left/right when target is far to the left (TB)', () => {
    const result = selectPorts({ x: 500, y: 100 }, { x: 50, y: 100 }, 'TB');
    expect(result).toEqual({ fromPort: 'left', toPort: 'right' });
  });

  it('biases toward vertical ports in TB mode on ambiguous angles', () => {
    // Equal normalized distances — TB bias should prefer vertical
    const result = selectPorts({ x: 0, y: 0 }, { x: 208, y: 108 }, 'TB');
    expect(result.fromPort === 'bottom' || result.fromPort === 'top').toBe(true);
  });

  it('biases toward horizontal ports in LR mode on ambiguous angles', () => {
    const result = selectPorts({ x: 0, y: 0 }, { x: 208, y: 108 }, 'LR');
    expect(result.fromPort === 'right' || result.fromPort === 'left').toBe(true);
  });

  it('chooses right/left for LR flow direction with target to the right', () => {
    const result = selectPorts({ x: 50, y: 100 }, { x: 300, y: 100 }, 'LR');
    expect(result).toEqual({ fromPort: 'right', toPort: 'left' });
  });

  it('uses vertical ports for co-located nodes (zero offset) in TB mode', () => {
    // Both at same position — flow bias breaks the tie toward vertical
    const result = selectPorts({ x: 100, y: 100 }, { x: 100, y: 100 }, 'TB');
    expect(result.fromPort === 'bottom' || result.fromPort === 'top').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cubicBezierPoint — Bézier evaluation at parameter t
// ---------------------------------------------------------------------------

describe('cubicBezierPoint', () => {
  const p0 = { x: 0, y: 0 };
  const p3 = { x: 300, y: 0 };

  it('returns start point at t=0', () => {
    const cp1 = { x: 100, y: -50 };
    const cp2 = { x: 200, y: 50 };
    const result = cubicBezierPoint(p0, cp1, cp2, p3, 0);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns end point at t=1', () => {
    const cp1 = { x: 100, y: -50 };
    const cp2 = { x: 200, y: 50 };
    const result = cubicBezierPoint(p0, cp1, cp2, p3, 1);
    expect(result.x).toBeCloseTo(300);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns midpoint at t=0.5 when all points are collinear', () => {
    // Straight line: control points on the line segment
    const cp1 = { x: 100, y: 0 };
    const cp2 = { x: 200, y: 0 };
    const result = cubicBezierPoint(p0, cp1, cp2, p3, 0.5);
    expect(result.x).toBeCloseTo(150);
    expect(result.y).toBeCloseTo(0);
  });

  it('degenerate curve (all points coincident) returns that point', () => {
    const p = { x: 42, y: 7 };
    const result = cubicBezierPoint(p, p, p, p, 0.5);
    expect(result.x).toBeCloseTo(42);
    expect(result.y).toBeCloseTo(7);
  });
});

// ---------------------------------------------------------------------------
// edgeLabelOnCurve — label position at curve midpoint
// ---------------------------------------------------------------------------

describe('edgeLabelOnCurve', () => {
  it('returns midpoint for a straight-line curve (symmetric control points)', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 200, y: 0 };
    // Collinear control points
    const result = edgeLabelOnCurve(start, { x: 66, y: 0 }, { x: 133, y: 0 }, end);
    expect(result.x).toBeCloseTo(100, 0);
    expect(result.y).toBeCloseTo(0);
  });

  it('deviates from linear midpoint when control points are asymmetric', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 0, y: 200 };
    // Control points pull the curve to the right
    const cp1 = { x: 100, y: 0 };
    const cp2 = { x: 100, y: 200 };
    const result = edgeLabelOnCurve(start, cp1, cp2, end);
    // Linear midpoint would be (0, 100); curve midpoint is pulled right
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
// computeLayerGaps — adaptive inter-layer spacing
// ---------------------------------------------------------------------------

describe('computeLayerGaps', () => {
  it('returns base gap for layers with no labeled edges', () => {
    const layers = [['a'], ['b']];
    const edges = [{ from: 'a', to: 'b' }]; // no label
    const layerMap = new Map([['a', 0], ['b', 1]]);
    const gaps = computeLayerGaps(layers, edges, layerMap, 64);
    expect(gaps).toEqual([64]);
  });

  it('returns base gap for a single labeled edge (no extra space needed)', () => {
    const layers = [['a'], ['b']];
    const edges = [{ from: 'a', to: 'b', label: 'next' }];
    const layerMap = new Map([['a', 0], ['b', 1]]);
    const gaps = computeLayerGaps(layers, edges, layerMap, 64);
    expect(gaps).toEqual([64]);
  });

  it('expands gap when multiple labeled edges cross the same layer pair', () => {
    const layers = [['a'], ['b', 'c', 'd']];
    const edges = [
      { from: 'a', to: 'b', label: 'yes' },
      { from: 'a', to: 'c', label: 'no' },
      { from: 'a', to: 'd', label: 'maybe' },
    ];
    const layerMap = new Map([['a', 0], ['b', 1], ['c', 1], ['d', 1]]);
    const gaps = computeLayerGaps(layers, edges, layerMap, 64);
    expect(gaps[0]).toBeGreaterThan(64);
  });

  it('returns empty array for a single layer (no gaps)', () => {
    const layers = [['a', 'b']];
    const edges: { from: string; to: string; label?: string }[] = [];
    const layerMap = new Map([['a', 0], ['b', 0]]);
    const gaps = computeLayerGaps(layers, edges, layerMap, 64);
    expect(gaps).toEqual([]);
  });

  it('ignores edges whose nodes are not in the layer map', () => {
    const layers = [['a'], ['b']];
    const edges = [
      { from: 'a', to: 'b', label: 'real' },
      { from: 'x', to: 'y', label: 'ghost' }, // unknown nodes
    ];
    const layerMap = new Map([['a', 0], ['b', 1]]);
    const gaps = computeLayerGaps(layers, edges, layerMap, 64);
    // Only 1 labeled edge between layers 0-1, so base gap
    expect(gaps).toEqual([64]);
  });
});

// ---------------------------------------------------------------------------
// countCrossings — edge crossing detection
// ---------------------------------------------------------------------------

describe('countCrossings', () => {
  it('returns zero for parallel edges (no crossing)', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    const edges = [
      { from: 'a', to: 'c' },
      { from: 'b', to: 'd' },
    ];
    expect(countCrossings(layers, edges)).toBe(0);
  });

  it('detects one crossing when two edges swap order', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    const edges = [
      { from: 'a', to: 'd' },
      { from: 'b', to: 'c' },
    ];
    expect(countCrossings(layers, edges)).toBe(1);
  });

  it('returns zero for a single edge', () => {
    const layers = [['a'], ['b']];
    const edges = [{ from: 'a', to: 'b' }];
    expect(countCrossings(layers, edges)).toBe(0);
  });

  it('returns zero for empty edges', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    expect(countCrossings(layers, [])).toBe(0);
  });

  it('returns zero for a single layer', () => {
    const layers = [['a', 'b', 'c']];
    const edges = [{ from: 'a', to: 'b' }];
    expect(countCrossings(layers, edges)).toBe(0);
  });

  it('ignores edges referencing nodes not in any layer', () => {
    const layers = [['a'], ['b']];
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'x', to: 'y' },
    ];
    expect(countCrossings(layers, edges)).toBe(0);
  });

  it('detects crossings in cross-layer edges (same layer pair)', () => {
    // Edges from layer 0 to layer 2 that cross
    const layers = [['a', 'b'], ['c'], ['d', 'e']];
    const edges = [
      { from: 'a', to: 'e' }, // layer 0 pos 0 → layer 2 pos 1
      { from: 'b', to: 'd' }, // layer 0 pos 1 → layer 2 pos 0
    ];
    expect(countCrossings(layers, edges)).toBe(1);
  });

  it('handles reversed edge direction (to before from in layer order)', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    const edges = [
      { from: 'd', to: 'a' }, // reversed: layer 1 pos 1 → layer 0 pos 0
      { from: 'c', to: 'b' }, // reversed: layer 1 pos 0 → layer 0 pos 1
    ];
    expect(countCrossings(layers, edges)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// minimizeCrossings — barycenter heuristic
// ---------------------------------------------------------------------------

describe('minimizeCrossings', () => {
  it('returns copy of input for single layer', () => {
    const layers = [['a', 'b', 'c']];
    const result = minimizeCrossings(layers, []);
    expect(result).toEqual([['a', 'b', 'c']]);
    expect(result).not.toBe(layers); // different reference
  });

  it('does not mutate the input layers', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    const original = layers.map(l => [...l]);
    const edges = [{ from: 'a', to: 'd' }, { from: 'b', to: 'c' }];
    minimizeCrossings(layers, edges);
    expect(layers).toEqual(original);
  });

  it('eliminates crossing by reordering target layer', () => {
    // Crossing: a→d crosses b→c
    const layers = [['a', 'b'], ['c', 'd']];
    const edges = [
      { from: 'a', to: 'd' },
      { from: 'b', to: 'c' },
    ];
    const result = minimizeCrossings(layers, edges);
    expect(countCrossings(result, edges)).toBe(0);
  });

  it('eliminates crossings with cross-layer edges', () => {
    // Simulates the problematic diagram pattern: edges from layer 0
    // skip layer 1 to reach layer 2, creating crossings
    const layers = [['a', 'b'], ['c'], ['d', 'e']];
    const edges = [
      { from: 'a', to: 'e' }, // cross-layer: 0→2, crosses with b→d
      { from: 'b', to: 'd' }, // cross-layer: 0→2
      { from: 'a', to: 'c' }, // normal: 0→1
    ];
    const result = minimizeCrossings(layers, edges);
    expect(countCrossings(result, edges)).toBe(0);
  });

  it('handles nodes with no cross-layer neighbors (preserves position)', () => {
    // Node 'z' in layer 1 has no neighbors — should stay put
    const layers = [['a'], ['z', 'b'], ['c']];
    const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
    const result = minimizeCrossings(layers, edges);
    // Should still be a valid ordering with all nodes present
    expect(new Set(result[1])).toEqual(new Set(['z', 'b']));
  });

  it('handles empty edge list gracefully', () => {
    const layers = [['a', 'b'], ['c', 'd']];
    const result = minimizeCrossings(layers, []);
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });
});
