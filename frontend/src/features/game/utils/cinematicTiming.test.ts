import { describe, expect, it } from 'vitest';

import {
  AWAIT_DISCHARGE_TIMEOUT_MS,
  DEATH_CINEMATIC_MS,
  DISCHARGE_CINEMATIC_MS,
  dischargeCinematicDurationMs,
  DRUM_SPINDOWN_MS,
  REVEAL_CARD_STAGGER_MS,
  REVEAL_VERDICT_HOLD_MS,
  revealCardFlipAtMs,
  ROUND_INTRO_MS,
  TRACE_SUSPENSE_MS,
  traceRevealDurationMs,
  verdictVisibleAtMs,
} from './cinematicTiming';

describe('cinematicTiming (BUG-02, UX-01, UX-04)', () => {
  it('computes correct traceRevealDurationMs based on card count, suspense and hold', () => {
    expect(traceRevealDurationMs(1)).toBe(
      TRACE_SUSPENSE_MS + 2 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS
    );
    expect(traceRevealDurationMs(3)).toBe(
      TRACE_SUSPENSE_MS + 4 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS
    );
  });

  it('computes correct verdictVisibleAtMs matching last flipped card timestamp', () => {
    const startedAt = 10000;
    const base = startedAt + TRACE_SUSPENSE_MS;
    expect(verdictVisibleAtMs(1, startedAt)).toBe(base + 2 * REVEAL_CARD_STAGGER_MS);
    expect(verdictVisibleAtMs(3, startedAt)).toBe(base + 4 * REVEAL_CARD_STAGGER_MS);
    expect(verdictVisibleAtMs(0, startedAt)).toBe(base + 2 * REVEAL_CARD_STAGGER_MS);
  });

  it('keeps every card face-down until the suspense build-up is over', () => {
    expect(revealCardFlipAtMs(0, 0)).toBe(TRACE_SUSPENSE_MS + REVEAL_CARD_STAGGER_MS);
    expect(revealCardFlipAtMs(2, 0) - revealCardFlipAtMs(1, 0)).toBe(REVEAL_CARD_STAGGER_MS);
  });

  it('leaves the loser part of the 5 s server decision window (ADR 0009) even for big plays', () => {
    expect(traceRevealDurationMs(4)).toBeLessThanOrEqual(4000);
  });

  it('guarantees dischargeCinematicDurationMs includes drum spindown duration', () => {
    expect(dischargeCinematicDurationMs(true)).toBe(DEATH_CINEMATIC_MS + DRUM_SPINDOWN_MS);
    expect(dischargeCinematicDurationMs(true)).toBe(5200);

    expect(dischargeCinematicDurationMs(false)).toBe(DISCHARGE_CINEMATIC_MS + DRUM_SPINDOWN_MS);
    expect(dischargeCinematicDurationMs(false)).toBe(5000);
  });

  it('omits drum spindown when reducedMotion is enabled', () => {
    expect(dischargeCinematicDurationMs(true, true)).toBe(DEATH_CINEMATIC_MS);
    expect(dischargeCinematicDurationMs(true, true)).toBe(3800);

    expect(dischargeCinematicDurationMs(false, true)).toBe(DISCHARGE_CINEMATIC_MS);
    expect(dischargeCinematicDurationMs(false, true)).toBe(3600);
  });

  it('defines await discharge watchdog timeout and drum spindown duration', () => {
    expect(AWAIT_DISCHARGE_TIMEOUT_MS).toBe(15000);
    expect(DRUM_SPINDOWN_MS).toBe(1400);
    expect(REVEAL_VERDICT_HOLD_MS).toBe(1700);
    expect(TRACE_SUSPENSE_MS).toBe(1000);
    expect(ROUND_INTRO_MS).toBe(1400);
  });
});
