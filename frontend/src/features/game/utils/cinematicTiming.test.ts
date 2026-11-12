import { describe, expect, it } from 'vitest';

import {
  AWAIT_DISCHARGE_TIMEOUT_MS,
  DEATH_CINEMATIC_MS,
  DISCHARGE_CINEMATIC_MS,
  dischargeCinematicDurationMs,
  REVEAL_CARD_STAGGER_MS,
  REVEAL_VERDICT_HOLD_MS,
  traceRevealDurationMs,
} from './cinematicTiming';

describe('cinematicTiming (BUG-02)', () => {
  it('computes correct traceRevealDurationMs based on card count and hold', () => {
    expect(traceRevealDurationMs(1)).toBe(2 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS);
    expect(traceRevealDurationMs(3)).toBe(4 * REVEAL_CARD_STAGGER_MS + REVEAL_VERDICT_HOLD_MS);
  });

  it('guarantees dischargeCinematicDurationMs is at least DEATH_CINEMATIC_MS on overload', () => {
    expect(dischargeCinematicDurationMs(true)).toBeGreaterThanOrEqual(DEATH_CINEMATIC_MS);
    expect(dischargeCinematicDurationMs(true)).toBe(3800);
  });

  it('returns standard DISCHARGE_CINEMATIC_MS when survived (not overloaded)', () => {
    expect(dischargeCinematicDurationMs(false)).toBe(DISCHARGE_CINEMATIC_MS);
    expect(dischargeCinematicDurationMs(false)).toBe(3600);
  });

  it('defines await discharge watchdog timeout', () => {
    expect(AWAIT_DISCHARGE_TIMEOUT_MS).toBe(4000);
  });
});
