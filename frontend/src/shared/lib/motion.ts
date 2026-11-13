import { useSyncExternalStore } from 'react';

function query(q: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(q).matches;
  } catch {
    return false;
  }
}

/** Check if the user has requested reduced motion via system preferences. */
export function prefersReducedMotion(): boolean {
  return query('(prefers-reduced-motion: reduce)');
}

/** Subscribe to prefers-reduced-motion media query changes. */
function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  try {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    } else if (typeof mql.addListener === 'function') {
      // Deprecated MediaQueryList listener fallback
      mql.addListener(onStoreChange);
      return () => mql.removeListener(onStoreChange);
    }
  } catch {
    // Ignore environments where matchMedia is not fully supported
  }
  return () => {};
}

/** React hook for live prefers-reduced-motion preference. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

/** True on devices with a precise pointer (mouse/trackpad) — used to show key hints. */
export function hasFinePointer(): boolean {
  return query('(pointer: fine)');
}

function subscribeFinePointer(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  try {
    const mql = window.matchMedia('(pointer: fine)');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    }
  } catch {
    // Ignore
  }
  return () => {};
}

/** Fine-pointer flag; false on the server snapshot so SSR stays deterministic. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribeFinePointer, hasFinePointer, () => false);
}
