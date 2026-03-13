import { useState, useEffect, DependencyList } from 'react';

interface AsyncRenderState {
  html: string | null;
  error: string | null;
  loading: boolean;
}

export function useAsyncRender(
  renderFn: () => Promise<string>,
  deps: DependencyList,
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
        const result = await renderFn();
        if (!cancelled) {
          setHtml(result);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { html, error, loading };
}
