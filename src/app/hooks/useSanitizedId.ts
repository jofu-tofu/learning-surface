import { useId } from 'react';

/** Returns a React-generated ID with colons stripped (safe for SVG marker IDs). */
export function useSanitizedId(): string {
  return useId().replace(/:/g, '');
}
