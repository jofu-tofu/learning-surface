import { useState, useEffect, useCallback, useRef } from 'react';

interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Measures the available width and height of a container element
 * via ResizeObserver. Returns { width, height } in CSS pixels,
 * both defaulting to 0 until the first observation fires.
 */
export function useContainerSize(): {
  ref: React.RefCallback<HTMLElement>;
  size: ContainerSize;
} {
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const ref = useCallback((node: HTMLElement | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    elementRef.current = node;

    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return { ref, size };
}
