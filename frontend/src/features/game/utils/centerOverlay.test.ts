import { describe, expect, it } from 'vitest';

import { resolveCenterOverlay } from './centerOverlay';

describe('resolveCenterOverlay (BUG-01)', () => {
  it('returns lobby when roomState is Lobby', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'Lobby',
        isRevealing: false,
        isDischarging: false,
      })
    ).toBe('lobby');
  });

  it('returns null during card reveal even if in BluffCheck', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'BluffCheck',
        isRevealing: true,
        isDischarging: false,
      })
    ).toBe(null);
  });

  it('returns null during discharge cinematic', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'VoltageTest',
        isRevealing: false,
        isDischarging: true,
      })
    ).toBe(null);
  });

  it('returns null during card reveal even if roomState is RoundOver', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'RoundOver',
        isRevealing: true,
        isDischarging: false,
      })
    ).toBe(null);
  });

  it('returns summary when GameOver and not presenting cinematic', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'GameOver',
        isRevealing: false,
        isDischarging: false,
      })
    ).toBe('summary');
  });

  it('returns intermission when RoundOver and not presenting cinematic', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'RoundOver',
        isRevealing: false,
        isDischarging: false,
      })
    ).toBe('intermission');
  });

  it('returns null during active gameplay (TurnActive, Dealing, etc.)', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'TurnActive',
        isRevealing: false,
        isDischarging: false,
      })
    ).toBe(null);
  });
});
