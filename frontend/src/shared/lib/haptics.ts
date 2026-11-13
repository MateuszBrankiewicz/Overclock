import { prefersReducedMotion } from './motion';

/** Thin, safe wrapper around `navigator.vibrate` (mobile haptics). */

export const HAPTIC_PATTERNS = {
  shock: 60,
  overload: [200, 80, 200, 80, 400],
  turn: 20,
  select: 10,
} as const;

export type HapticKind = keyof typeof HAPTIC_PATTERNS;

/** Returns true when a vibration was requested. No-op when unsupported or reduced motion is preferred. */
export function vibrate(kind: HapticKind): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    if (prefersReducedMotion()) return false;
    const pattern = HAPTIC_PATTERNS[kind];
    return navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    return false;
  }
}
