import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delayMs`
 * milliseconds have elapsed since the last change.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
