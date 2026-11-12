import { useSyncExternalStore } from 'react';

function query(q: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(q).matches;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return query('(prefers-reduced-motion: reduce)');
}

/** True on devices with a precise pointer (mouse/trackpad) — used to show key hints. */
export function hasFinePointer(): boolean {
  return query('(pointer: fine)');
}

const noopSubscribe = () => () => {};

/** Fine-pointer flag; false on the server snapshot so SSR stays deterministic. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(noopSubscribe, hasFinePointer, () => false);
}
