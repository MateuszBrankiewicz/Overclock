import { describe, expect, it } from 'vitest';

import { resolveCenterOverlay } from './centerOverlay';

describe('resolveCenterOverlay', () => {
  it('returns lobby when roomState is Lobby', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'Lobby',
        phase: null,
      })
    ).toBe('lobby');
  });

  it('returns null during reveal or discharge phases', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'BluffCheck',
        phase: 'reveal',
      })
    ).toBe(null);

    expect(
      resolveCenterOverlay({
        roomState: 'RoundOver',
        phase: 'discharge',
      })
    ).toBe(null);

    expect(
      resolveCenterOverlay({
        roomState: 'VoltageTest',
        phase: 'decision',
      })
    ).toBe(null);
  });

  it('returns summary during summary phase', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'GameOver',
        phase: 'summary',
      })
    ).toBe('summary');
  });

  it('returns intermission during intermission phase', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'RoundOver',
        phase: 'intermission',
      })
    ).toBe('intermission');
  });

  it('returns null during normal active gameplay', () => {
    expect(
      resolveCenterOverlay({
        roomState: 'TurnActive',
        phase: null,
      })
    ).toBe(null);
  });
});
