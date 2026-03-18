import type { DependencyList } from 'react';
import { useState, useEffect } from 'react';

interface AsyncRenderState {
  html: string | null;
  error: string | null;
  loading: boolean;
}

export function useAsyncRender(
  asyncRenderer: () => Promise<string>,
  dependencies: DependencyList,
  initialState?: Partial<AsyncRenderState>,
): AsyncRenderState {
  const [html, setHtml] = useState<string | null>(initialState?.html ?? null);
  const [error, setError] = useState<string | null>(initialState?.error ?? null);
  const [loading, setLoading] = useState(initialState?.loading ?? true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);

    (async () => {
      try {
        const renderedHtml = await asyncRenderer();
        if (!cancelled) {
          setHtml(renderedHtml);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(`Error: ${e instanceof Error ? e.message : String(e)}`);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps; asyncRenderer intentionally excluded to allow inline functions
  }, dependencies);

  return { html, error, loading };
}
