import { useState, useEffect } from 'react';

/** Shared hook for mount animation with content-change reset.
 *  Returns `true` once the component has mounted (on the next frame).
 *  Resets to `false` and re-mounts when `content` changes. */
export function useMountAnimation(content: string): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, [content]);
  return mounted;
}
