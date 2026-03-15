import type React from 'react';

/** Determine CSS style to fit an SVG within a container, preserving aspect ratio. */
export function computeSvgFitStyle(
  diagramWidth: number, diagramHeight: number,
  containerWidth: number | undefined, containerHeight: number | undefined,
): { width: string; height: string; maxWidth?: string } {
  const safeContainerWidth = containerWidth ?? 0;
  const safeContainerHeight = containerHeight ?? 0;
  if (safeContainerWidth > 0 && safeContainerHeight > 0) {
    const diagramAspect = diagramWidth / diagramHeight;
    const containerAspect = safeContainerWidth / safeContainerHeight;
    if (diagramAspect > containerAspect) {
      return { width: '100%', height: 'auto' };
    }
    return { width: 'auto', height: '100%', maxWidth: '100%' };
  }
  return { width: '100%', height: 'auto' };
}

/** Inline style for mount-animation opacity with optional stagger delay. */
export function mountStyle(mounted: boolean, delay = 0): React.CSSProperties {
  return { opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease ${delay}s` };
}

/** Generate staggered transition string for indexed items. */
export function staggerTransition(index: number, duration = 0.4, stagger = 0.05, base = 0): string {
  return `opacity ${duration}s ease ${base + index * stagger}s`;
}
