import { useEffect, useRef } from 'react';

/**
 * Plays a refresh animation (fade + slide-up) when `fingerprint` changes.
 * Returns a ref to attach to the animated container element.
 * Skips the initial render — only animates on subsequent changes.
 */
export function useContentRefresh(
  fingerprint: string,
  delayMs: number = 0,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const prevRef = useRef(fingerprint);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = fingerprint;
      return;
    }
    if (fingerprint === prevRef.current) return;
    prevRef.current = fingerprint;

    const el = ref.current;
    if (!el) return;

    el.getAnimations().forEach(a => a.cancel());
    el.animate(
      [
        { opacity: 0.3, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 450,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        delay: delayMs,
        fill: 'backwards',
      },
    );
  }, [fingerprint, delayMs]);

  return ref;
}
