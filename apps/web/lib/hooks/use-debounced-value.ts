'use client';

import { useEffect, useState } from 'react';

/** Delays reflecting `value` by `delayMs` — for search inputs, so every keystroke doesn't refire a list query. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
