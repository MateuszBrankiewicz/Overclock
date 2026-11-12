/**
 * Client-side presentation timings for the trace -> discharge -> next round sequence.
 * Kept in one place so the store, the overlays and the tests agree on them.
 */

/** Per-card flip stagger of the trace reveal. */
export const REVEAL_CARD_STAGGER_MS = 220;
/** How long the verdict stays on screen after the last card flipped. */
export const REVEAL_VERDICT_HOLD_MS = 2100;

/** Total duration of the card reveal for `cardCount` revealed cards. */
export function traceRevealDurationMs(cardCount: number): number {
  return (Math.max(1, cardCount) + 1) * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS;
}

/** Duration of the 3D discharge / death cinematic on the tested operator. */
export const DISCHARGE_CINEMATIC_MS = 3600;

/** Real duration of the multi-phase operator elimination/death kinematic. */
export const DEATH_CINEMATIC_MS = 3800;

/** Maximum time client waits for discharge event after trace resolution before releasing watchdog. */
export const AWAIT_DISCHARGE_TIMEOUT_MS = 4000;

/** Duration of the 3D discharge or death cinematic on the tested operator. */
export function dischargeCinematicDurationMs(overloaded: boolean): number {
  return overloaded ? Math.max(DISCHARGE_CINEMATIC_MS, DEATH_CINEMATIC_MS) : DISCHARGE_CINEMATIC_MS;
}

/** How long the "round N - protocol X" announcement stays up. */
export const ROUND_INTRO_MS = 2200;

/**
 * Turn length used to estimate the turn deadline locally. Mirrors
 * `TurnTimerEngine.DefaultTurnDuration` on the server, which does not yet send the
 * deadline itself (see ADR 0015).
 */
export const TURN_DURATION_SECONDS = 15;

export function estimateTurnDeadlineUtc(nowMs: number = Date.now()): string {
  return new Date(nowMs + TURN_DURATION_SECONDS * 1000).toISOString();
}
