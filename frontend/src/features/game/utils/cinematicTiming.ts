/**
 * Client-side presentation timings for the trace -> discharge -> next round sequence.
 * Kept in one place so the store, the overlays and the tests agree on them.
 */

/**
 * Build-up before the first card flips: the accuser -> accused duel is announced and the face-down
 * cards are scanned. The whole reveal must stay well under the server's 5 s VoltageTest decision
 * window (ADR 0009), or the loser never gets to choose before the watchdog discharges for them.
 */
export const TRACE_SUSPENSE_MS = 1000;
/** Per-card flip stagger of the trace reveal. */
export const REVEAL_CARD_STAGGER_MS = 260;
/** How long the verdict stays on screen after the last card flipped. */
export const REVEAL_VERDICT_HOLD_MS = 1700;

/** Timestamp in ms when card `index` of the reveal starts flipping. */
export function revealCardFlipAtMs(index: number, startedAtMs: number): number {
  return startedAtMs + TRACE_SUSPENSE_MS + (index + 1) * REVEAL_CARD_STAGGER_MS;
}

/** Timestamp in ms when the trace verdict becomes visible (after the last card flips). */
export function verdictVisibleAtMs(cardCount: number, startedAtMs: number): number {
  return revealCardFlipAtMs(Math.max(1, cardCount), startedAtMs);
}

/** Total duration of the card reveal for `cardCount` revealed cards. */
export function traceRevealDurationMs(cardCount: number): number {
  return verdictVisibleAtMs(cardCount, 0) + REVEAL_VERDICT_HOLD_MS;
}

/**
 * Discharge sequence on the tested operator, all measured from `dischargeCinematic.startedAtMs`:
 *   charge  [0, CHARGE)                  capacitor drum rises out of the table and charges up
 *   roll    [CHARGE, CHARGE + SPINDOWN)  drum spins down onto the d6 chamber
 *   strike  [CHARGE + SPINDOWN, end)     arc hits the operator, result is shown
 * Reduced motion skips straight to the strike.
 */
export const DISCHARGE_CHARGE_MS = 1200;

/** High-voltage capacitor drum spin-down deceleration duration before shock execution. */
export const DRUM_SPINDOWN_MS = 1400;

/** Time after the strike: the arc / result (survived) or the death kinematic (overloaded). */
export const DISCHARGE_CINEMATIC_MS = 3000;
export const DEATH_CINEMATIC_MS = 3400;

/** Maximum time client waits for discharge event after trace resolution before releasing watchdog. */
export const AWAIT_DISCHARGE_TIMEOUT_MS = 15000;

/** Delay from the start of the discharge cinematic until the arc strikes the operator. */
export function dischargeStrikeDelayMs(reducedMotion = false): number {
  return reducedMotion ? 0 : DISCHARGE_CHARGE_MS + DRUM_SPINDOWN_MS;
}

export type DischargeStage = 'charge' | 'roll' | 'strike';

/** Which stage of the discharge sequence is on screen `elapsedMs` after it started. */
export function dischargeStageAt(elapsedMs: number, reducedMotion = false): DischargeStage {
  if (elapsedMs >= dischargeStrikeDelayMs(reducedMotion)) return 'strike';
  return elapsedMs < DISCHARGE_CHARGE_MS ? 'charge' : 'roll';
}

/** Full duration of the discharge sequence (build-up + strike + aftermath). */
export function dischargeCinematicDurationMs(overloaded: boolean, reducedMotion = false): number {
  const base = overloaded ? Math.max(DISCHARGE_CINEMATIC_MS, DEATH_CINEMATIC_MS) : DISCHARGE_CINEMATIC_MS;
  return base + dischargeStrikeDelayMs(reducedMotion);
}

/** How long the "round N - protocol X" announcement stays up. */
export const ROUND_INTRO_MS = 1400;
