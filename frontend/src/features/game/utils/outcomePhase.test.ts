import { describe, expect, it } from 'vitest';

import { resolveOutcomePhase } from './outcomePhase';

describe('resolveOutcomePhase (BUG-02)', () => {
  it('prioritizes reveal over VoltageTest and RoundOver', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'VoltageTest',
        hasTraceReveal: true,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe('reveal');

    expect(
      resolveOutcomePhase({
        roomState: 'RoundOver',
        hasTraceReveal: true,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: true,
      })
    ).toBe('reveal');
  });

  it('enters decision phase when roomState is VoltageTest after reveal', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'VoltageTest',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe('decision');
  });

  it('keeps a playing discharge on screen while the snapshot still says VoltageTest', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'VoltageTest',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: true,
        awaitingDischarge: false,
      })
    ).toBe('discharge');
  });

  it('enters discharge phase when discharge is playing or queued', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'RoundOver',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: true,
        awaitingDischarge: false,
      })
    ).toBe('discharge');

    expect(
      resolveOutcomePhase({
        roomState: 'RoundOver',
        hasTraceReveal: false,
        hasQueuedDischarge: true,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe('discharge');
  });

  it('enters discharge phase while awaiting discharge after trace resolution', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'RoundOver',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: true,
      })
    ).toBe('discharge');
  });

  it('enters summary phase when roomState is GameOver and all cinimatics finished', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'GameOver',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe('summary');
  });

  it('enters intermission phase only when RoundOver and nothing pending', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'RoundOver',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe('intermission');
  });

  it('returns null during active turns / normal gameplay', () => {
    expect(
      resolveOutcomePhase({
        roomState: 'TurnActive',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe(null);

    expect(
      resolveOutcomePhase({
        roomState: 'Lobby',
        hasTraceReveal: false,
        hasQueuedDischarge: false,
        hasDischargeCinematic: false,
        awaitingDischarge: false,
      })
    ).toBe(null);
  });
});
