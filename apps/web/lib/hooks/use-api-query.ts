'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api-client';

interface QueryState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export interface UseApiQueryResult<T> extends QueryState<T> {
  refetch: () => void;
}

/**
 * Small, genuinely reusable loading/error/data wrapper around a fetcher —
 * every list/detail page from here on needs exactly this shape, so it's
 * worth the extraction now rather than each future phase re-deriving it.
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiQueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({ data: null, error: null, isLoading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, isLoading: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        setState({ data: null, error: message, isLoading: false });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, refetch };
}
