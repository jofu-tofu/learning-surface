import React from 'react';
import {
  computeTooltipPosition,
  TOOLTIP_MAX_WIDTH,
  TOOLTIP_FO_HEIGHT,
} from '../diagram-layout.js';

interface SvgTooltipProps {
  text: string;
  x: number;
  y: number;
  svgWidth: number;
  /**
   * 'above' (default) positions the tooltip above the anchor point,
   * matching the DiagramRenderer behavior.
   * 'below' places the tooltip below the anchor with no vertical transform.
   */
  placement?: 'above' | 'below';
}

/**
 * Shared SVG tooltip rendered via `<foreignObject>`.
 *
 * The anchor coordinates (x, y) are horizontally centred and clamped
 * within the SVG bounds.  Vertical positioning depends on `placement`:
 *  - `"above"` (default): tooltip floats above the anchor.
 *  - `"below"`: tooltip starts immediately below the anchor.
 */
export function SvgTooltip({
  text,
  x,
  y,
  svgWidth,
  placement = 'above',
}: SvgTooltipProps): React.ReactElement {
  const pos =
    placement === 'above'
      ? computeTooltipPosition(x, y, svgWidth)
      : {
          x: Math.min(
            Math.max(x - TOOLTIP_MAX_WIDTH / 2, 4),
            svgWidth - TOOLTIP_MAX_WIDTH - 4,
          ),
          y,
        };

  return (
    <foreignObject
      x={pos.x}
      y={pos.y}
      width={TOOLTIP_MAX_WIDTH}
      height={TOOLTIP_FO_HEIGHT}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          background: 'var(--color-surface-900)',
          border: '1px solid var(--color-surface-600)',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '11px',
          lineHeight: '1.4',
          color: 'var(--color-surface-200)',
          maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
          ...(placement === 'above' && { transform: 'translateY(-100%)' }),
          boxShadow: '0 4px 12px var(--color-shadow-color)',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}
