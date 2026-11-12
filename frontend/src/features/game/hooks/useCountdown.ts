import { useEffect, useState } from 'react';

export const CRITICAL_THRESHOLD_SECONDS = 5;
const TICK_INTERVAL_MS = 250;

export interface CountdownState {
  /** Whole seconds left, rounded up (0 once expired). */
  secondsLeft: number;
  /** Remaining share of the full duration, 0..1. */
  fraction: number;
  /** True during the last 5 seconds while the countdown is still running. */
  isCritical: boolean;
  /** True when a valid deadline is being tracked. */
  isActive: boolean;
}

export const IDLE_COUNTDOWN: CountdownState = {
  secondsLeft: 0,
  fraction: 0,
  isCritical: false,
  isActive: false,
};

export function parseDeadline(deadlineUtc: string | null | undefined): number | null {
  if (!deadlineUtc) return null;
  const ms = new Date(deadlineUtc).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Pure countdown math, shared by the hook and unit tests. */
export function computeCountdown(
  deadlineMs: number | null,
  nowMs: number,
  fullSeconds: number
): CountdownState {
  if (deadlineMs === null) return IDLE_COUNTDOWN;
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const total = Math.max(1, fullSeconds);
  return {
    secondsLeft,
    fraction: Math.min(1, remainingMs / 1000 / total),
    isCritical: remainingMs > 0 && remainingMs <= CRITICAL_THRESHOLD_SECONDS * 1000,
    isActive: true,
  };
}

/** Starts a ticking countdown; returns a stop function that clears the timer. */
export function startCountdown(
  deadlineMs: number,
  fullSeconds: number,
  onTick: (state: CountdownState) => void,
  now: () => number = Date.now,
  intervalMs: number = TICK_INTERVAL_MS
): () => void {
  const tick = () => onTick(computeCountdown(deadlineMs, now(), fullSeconds));
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

/**
 * Counts down to a UTC deadline. When `fullSeconds` is omitted, the remaining time
 * observed when the deadline first appears is used as the full duration.
 */
export function useCountdown(
  deadlineUtc: string | null | undefined,
  fullSeconds?: number
): CountdownState {
  const deadlineMs = parseDeadline(deadlineUtc);
  const [state, setState] = useState<CountdownState>(() =>
    deadlineMs === null
      ? IDLE_COUNTDOWN
      : computeCountdown(
          deadlineMs,
          Date.now(),
          fullSeconds ?? Math.max(1, (deadlineMs - Date.now()) / 1000)
        )
  );

  useEffect(() => {
    if (deadlineMs === null) return;
    const full = fullSeconds ?? Math.max(1, (deadlineMs - Date.now()) / 1000);
    return startCountdown(deadlineMs, full, setState);
  }, [deadlineMs, fullSeconds]);

  return deadlineMs === null ? IDLE_COUNTDOWN : state;
}
