import { useMemo } from 'react';
import { useMountAnimation } from './useMountAnimation.js';

/**
 * Shared hook for SVG renderers: mount-animation + parse + layout pipeline.
 * All three functions (parse, layout) should be stable module-level references.
 */
export function useRendererLayout<TData, TLayout>(
  content: string,
  parse: (content: string) => TData | null,
  computeLayout: (data: TData) => TLayout,
): { mounted: boolean; data: TData | null; layout: TLayout | null } {
  const mounted = useMountAnimation(content);
  const data = useMemo(() => parse(content), [content, parse]);
  const layout = useMemo(() => data ? computeLayout(data) : null, [data, computeLayout]);
  return { mounted, data, layout };
}
