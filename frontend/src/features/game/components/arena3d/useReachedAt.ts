import { useEffect, useState } from 'react';

/** True once the wall clock passes `atMs` (re-armed whenever `atMs` changes; false for null). */
export function useReachedAt(atMs: number | null): boolean {
  const [reachedFor, setReachedFor] = useState<number | null>(null);

  useEffect(() => {
    if (atMs === null) return;
    const timer = setTimeout(() => setReachedFor(atMs), Math.max(0, atMs - Date.now()));
    return () => clearTimeout(timer);
  }, [atMs]);

  return atMs !== null && reachedFor === atMs;
}
