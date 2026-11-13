import { describe, expect, it } from 'vitest';

import {
  CABLE_RIM_RADIUS,
  CABLE_TABLE_Y,
  HEAVY_SHOCK_MS,
  LIGHT_SHOCK_MS,
  resolveCableTargetId,
  shockCablePaths,
  shockCableState,
} from './shockCables';

describe('shockCablePaths', () => {
  it('runs both leads from the rim on the operator side, never over the table centre', () => {
    const target: [number, number, number] = [0, 1.15, -2.3];
    for (const { points } of shockCablePaths(target)) {
      const [rim, mid, body] = points;
      expect(rim[1]).toBe(CABLE_TABLE_Y);
      expect(Math.hypot(rim[0], rim[2])).toBeGreaterThan(
        CABLE_RIM_RADIUS - 0.01,
      );
      expect(rim[2]).toBeLessThan(0);
      // Slack: the middle hangs below both ends.
      expect(mid[1]).toBeLessThan(Math.min(rim[1], body[1]));
      expect(body[1]).toBe(target[1]);
    }
  });

  it('clamps the leads on opposite shoulders', () => {
    const [left, right] = shockCablePaths([2, 1.15, 0]);
    expect(left.points[2][2]).toBeCloseTo(-right.points[2][2]);
    expect(left.points[2][2]).not.toBeCloseTo(0);
  });

  it('keeps the rim anchor inside the operator distance for a close seat', () => {
    const [lead] = shockCablePaths([0, 1, 1.85]);
    expect(lead.points[0][2]).toBeLessThan(1.85);
  });
});

describe('shockCableState', () => {
  it('is only armed before the discharge starts', () => {
    expect(shockCableState(1000, null, null, true)).toEqual({
      charge: 0,
      sinceStrikeMs: null,
      shock: 0,
    });
  });

  it('charges identically whatever the outcome, so the cables never spoil the roll', () => {
    const survived = shockCableState(1500, 0, 2600, false);
    const shorted = shockCableState(1500, 0, 2600, true);
    expect(survived).toEqual(shorted);
    expect(survived.charge).toBeCloseTo(1500 / 2600);
    expect(survived.shock).toBe(0);
  });

  it('gives a light, short jolt to a survivor and a heavy, long one on overload', () => {
    const light = shockCableState(2600 + 50, 0, 2600, false);
    const heavy = shockCableState(2600 + 50, 0, 2600, true);
    expect(light.shock).toBeGreaterThan(0);
    expect(heavy.shock).toBeGreaterThan(light.shock * 1.8);

    expect(shockCableState(2600 + LIGHT_SHOCK_MS, 0, 2600, false).shock).toBe(
      0,
    );
    expect(
      shockCableState(2600 + LIGHT_SHOCK_MS, 0, 2600, true).shock,
    ).toBeGreaterThan(0);
    expect(shockCableState(2600 + HEAVY_SHOCK_MS, 0, 2600, true).shock).toBe(0);
  });

  it('strikes immediately under reduced motion (strike at the discharge start)', () => {
    expect(shockCableState(0, 0, 0, false).sinceStrikeMs).toBe(0);
  });
});

describe('resolveCableTargetId', () => {
  const base = {
    dischargePlayerId: null,
    voltageTargetPlayerId: 'loser',
    isRevealOnScreen: true,
    areRevealCardsSettled: false,
  };

  it('keeps the leads off while the reveal cards are still turning', () => {
    expect(resolveCableTargetId(base)).toBeNull();
  });

  it('clamps them on the loser once the cards stop turning', () => {
    expect(resolveCableTargetId({ ...base, areRevealCardsSettled: true })).toBe(
      'loser',
    );
  });

  it('keeps them on after the reveal is gone, while waiting for the discharge', () => {
    expect(resolveCableTargetId({ ...base, isRevealOnScreen: false })).toBe(
      'loser',
    );
  });

  it('follows the discharged operator through the strike', () => {
    expect(
      resolveCableTargetId({
        ...base,
        isRevealOnScreen: false,
        voltageTargetPlayerId: null,
        dischargePlayerId: 'p2',
      }),
    ).toBe('p2');
  });
});
