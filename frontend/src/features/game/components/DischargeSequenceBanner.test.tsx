import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useI18n } from '../../../shared/i18n';
import { DISCHARGE_CHARGE_MS, dischargeStrikeDelayMs } from '../utils/cinematicTiming';
import {
  DischargeSequenceBanner,
  type DischargeSequenceBannerProps,
} from './DischargeSequenceBanner';

const START = 50_000;

const render = (elapsedMs: number, overrides: Partial<DischargeSequenceBannerProps> = {}) => {
  vi.spyOn(Date, 'now').mockReturnValue(START + elapsedMs);
  return renderToString(
    React.createElement(DischargeSequenceBanner, {
      targetNickname: 'Bob',
      isLocalTarget: false,
      roll: 5,
      riskLevel: 2,
      overloaded: false,
      resultingRiskLevel: 3,
      startedAtMs: START,
      ...overrides,
    })
  );
};

describe('DischargeSequenceBanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useI18n.getState().setLanguage('pl');
  });

  it('charges the capacitor on the target first, without spoiling the roll', () => {
    const html = render(100);
    expect(html).toContain('data-stage="charge"');
    expect(html).toContain('Bob');
    expect(html).toContain('ŁADOWANIE KONDENSATORA');
    expect(html).toContain('zwarcie przy wyniku ≤ 2');
    expect(html).not.toContain('discharge-result');
  });

  it('tumbles the d6 while the drum spins down', () => {
    const html = render(DISCHARGE_CHARGE_MS + 100);
    expect(html).toContain('data-stage="roll"');
    expect(html).toContain('RZUT K6');
    expect(html).not.toContain('discharge-result');
  });

  it('shows one compact result on the strike', () => {
    const survived = render(dischargeStrikeDelayMs() + 10);
    expect(survived).toContain('data-stage="strike"');
    expect(survived).toContain('IZOLACJA WYTRZYMAŁA');
    expect(survived).toContain('ryzyko teraz 3/6');

    const shorted = render(dischargeStrikeDelayMs() + 10, { roll: 1, overloaded: true });
    expect(shorted).toContain('ZWARCIE // ELIMINACJA');
    expect(shorted).not.toContain('ryzyko teraz');
  });

  it('labels the local player as TY', () => {
    expect(render(100, { isLocalTarget: true })).toContain('TY');
  });
});
