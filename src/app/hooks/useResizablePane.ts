import { useState, useCallback, useRef, useEffect } from 'react';

interface UseResizablePaneOptions {
  /** Initial split percentage for the left pane (0–100). */
  initialSplit?: number;
  /** Minimum width percentage for either pane. */
  minPercent?: number;
}

interface UseResizablePaneReturn {
  /** Current split percentage (0–100) for the left pane. */
  splitPercent: number;
  /** Whether the user is currently dragging the handle. */
  isDragging: boolean;
  /** Attach to the container element that holds both panes. */
  containerRef: React.RefCallback<HTMLDivElement>;
  /** Call on mousedown / pointerdown on the resize handle. */
  startDrag: (e: React.PointerEvent) => void;
}

export function useResizablePane({
  initialSplit = 50,
  minPercent = 20,
}: UseResizablePaneOptions = {}): UseResizablePaneReturn {
  const [splitPercent, setSplitPercent] = useState(initialSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerEl = useRef<HTMLDivElement | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerEl.current = node;
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const onPointerMove = (ev: PointerEvent) => {
        if (!containerEl.current) return;
        const rect = containerEl.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        let pct = (x / rect.width) * 100;
        pct = Math.max(minPercent, Math.min(100 - minPercent, pct));
        setSplitPercent(pct);
      };

      const onPointerUp = () => {
        setIsDragging(false);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [minPercent],
  );

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      const prev = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.userSelect = prev;
      };
    }
  }, [isDragging]);

  return { splitPercent, isDragging, containerRef, startDrag };
}
