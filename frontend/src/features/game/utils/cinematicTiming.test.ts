import { describe, expect, it } from 'vitest';

import {
  AWAIT_DISCHARGE_TIMEOUT_MS,
  DEATH_CINEMATIC_MS,
  DISCHARGE_CINEMATIC_MS,
  dischargeCinematicDurationMs,
  DRUM_SPINDOWN_MS,
  REVEAL_CARD_STAGGER_MS,
  REVEAL_VERDICT_HOLD_MS,
  ROUND_INTRO_MS,
  traceRevealDurationMs,
  verdictVisibleAtMs,
} from './cinematicTiming';

describe('cinematicTiming (BUG-02, UX-01, UX-04)', () => {
  it('computes correct traceRevealDurationMs based on card count and hold', () => {
    expect(traceRevealDurationMs(1)).toBe(2 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS);
    expect(traceRevealDurationMs(3)).toBe(4 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS);
  });

  it('computes correct verdictVisibleAtMs matching last flipped card timestamp', () => {
    const startedAt = 10000;
    expect(verdictVisibleAtMs(1, startedAt)).toBe(startedAt + 2 * REVEAL_CARD_STAGGER_MS);
    expect(verdictVisibleAtMs(3, startedAt)).toBe(startedAt + 4 * REVEAL_CARD_STAGGER_MS);
    expect(verdictVisibleAtMs(0, startedAt)).toBe(startedAt + 2 * REVEAL_CARD_STAGGER_MS);
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
    expect(REVEAL_VERDICT_HOLD_MS).toBe(1600);
    expect(ROUND_INTRO_MS).toBe(1400);
  });
});
