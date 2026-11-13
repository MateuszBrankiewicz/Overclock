import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useI18n } from '../../../../shared/i18n';
import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import {
  DISCHARGE_CHARGE_MS,
  dischargeStrikeDelayMs,
  verdictVisibleAtMs,
} from '../../utils/cinematicTiming';
import { BluffShowdown, type BluffShowdownProps } from './BluffShowdown';
import type { ShowdownOperator } from './showdownParts';

const START = 10_000;

const op = (nickname: string, isLocal = false, riskLevel = 1): ShowdownOperator => ({
  nickname,
  isLocal,
  riskLevel,
});

const cards = (...protocols: CardProtocol[]): PlayerCard[] =>
  protocols.map((protocol, i) => ({ id: `c${i}`, protocol }));

interface TraceOpts {
  accuser?: ShowdownOperator;
  accused?: ShowdownOperator;
  declaredProtocol?: CardProtocol;
  revealed?: PlayerCard[];
  bluffDetected?: boolean;
}

/** Renders the reveal stage `offsetMs` relative to the moment the verdict becomes visible. */
const renderReveal = (
  offsetMs: number,
  opts: TraceOpts = {},
  extra: Partial<BluffShowdownProps> = {}
) => {
  const revealed = opts.revealed ?? cards('Corrupted', 'Alpha');
  vi.spyOn(Date, 'now').mockReturnValue(verdictVisibleAtMs(revealed.length, START) + offsetMs);
  return renderToString(
    React.createElement(BluffShowdown, {
      trace: {
        accuser: opts.accuser ?? op('Alice'),
        accused: opts.accused ?? op('Bob'),
        declaredProtocol: opts.declaredProtocol ?? 'Alpha',
        cards: revealed,
        bluffDetected: opts.bluffDetected ?? true,
      },
      revealStartedAtMs: START,
      discharge: null,
      target: null,
      decision: null,
      ...extra,
    })
  );
};

const renderDischarge = (
  elapsedMs: number,
  overrides: Partial<NonNullable<BluffShowdownProps['discharge']>> = {},
  target: ShowdownOperator = op('Bob')
) => {
  vi.spyOn(Date, 'now').mockReturnValue(START + elapsedMs);
  return renderToString(
    React.createElement(BluffShowdown, {
      trace: null,
      revealStartedAtMs: null,
      discharge: {
        startedAtMs: START,
        roll: 5,
        riskLevel: 2,
        overloaded: false,
        resultingRiskLevel: 3,
        ...overrides,
      },
      target,
      decision: null,
    })
  );
};

const renderDecision = (target: ShowdownOperator, canUseGroundWire: boolean) => {
  vi.spyOn(Date, 'now').mockReturnValue(START);
  return renderToString(
    React.createElement(BluffShowdown, {
      trace: null,
      revealStartedAtMs: null,
      discharge: null,
      target,
      decision: {
        deadlineUtc: new Date(START + 5000).toISOString(),
        canUseGroundWire,
        onDeployGroundWire: () => {},
        onTriggerDischarge: () => {},
      },
    })
  );
};

describe('BluffShowdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useI18n.getState().setLanguage('pl');
  });

  describe('trace reveal', () => {
    it('announces who traces whom and the claim, hiding the verdict while cards are face-down', () => {
      const html = renderReveal(-100);

      expect(html).toContain('data-stage="scan"');
      expect(html).toContain('trace-duel-line');
      expect(html).toMatch(/Alice.*SPRAWDZA.*Bob/s);
      expect(html).toContain('2× ALPHA');
      expect(html).not.toContain('trace-verdict-title');
      expect(html).not.toContain('BLEF WYKRYTY');
      expect(html).not.toContain('CZYSTA TRANSMISJA');
      expect(html).not.toContain('idzie na test');
      expect(html).not.toContain('data-state="tested"');
      expect(html).not.toContain('data-state="safe"');
    });

    it('labels the local player as TY in the duel line', () => {
      const html = renderReveal(-100, {
        accuser: op('Me', true),
        accused: op('Rival'),
        bluffDetected: false,
        revealed: cards('Beta'),
        declaredProtocol: 'Beta',
      });
      expect(html).toMatch(/>TY<.*SPRAWDZA.*>Rival</s);
    });

    it('shows the bluff verdict, its reason and the loser in Polish', () => {
      const html = renderReveal(50);

      expect(html).toContain('data-stage="verdict"');
      expect(html).toContain('trace-verdict-title');
      expect(html).toContain('BLEF WYKRYTY');
      expect(html).toContain('1 z 2 kart to nie ALPHA');
      expect(html).toContain('trace-verdict-subtitle');
      expect(html).toContain('Bob idzie na test napięcia');
      expect(html).toContain('border-red-500');
    });

    it('shows the clean transmission verdict sending the accuser to the test', () => {
      const html = renderReveal(50, {
        bluffDetected: false,
        declaredProtocol: 'Beta',
        revealed: cards('Beta'),
      });

      expect(html).toContain('CZYSTA TRANSMISJA');
      expect(html).toContain('wszystkie karty pasują do BETA');
      expect(html).toContain('Alice idzie na test napięcia');
      expect(html).toContain('border-emerald-400');
    });

    it('tells the local loser that they go to the voltage test', () => {
      const html = renderReveal(50, {
        accuser: op('Rival'),
        accused: op('Me', true),
        declaredProtocol: 'Gamma',
        revealed: cards('Gamma', 'Corrupted', 'Gamma'),
      });
      expect(html).toContain('TY idziesz na test napięcia');
    });

    it('translates both verdicts to English', () => {
      useI18n.getState().setLanguage('en');

      const bluff = renderReveal(50, {
        accuser: op('Rival'),
        accused: op('Me', true),
        revealed: cards('Corrupted'),
      });
      expect(bluff).toContain('BLUFF DETECTED');
      expect(bluff).toContain('YOU go to voltage test');

      const clean = renderReveal(50, {
        accuser: op('Rival'),
        accused: op('Me', true),
        bluffDetected: false,
        revealed: cards('Alpha'),
      });
      expect(clean).toContain('CLEAN TRANSMISSION');
      expect(clean).toContain('Rival goes to voltage test');
    });

    it('shows the skip hint only when the sequence can be skipped', () => {
      expect(renderReveal(50, {}, { onSkip: () => {} })).toContain('SPACJA / DOTKNIJ, ABY POMINĄĆ');
      expect(renderReveal(50)).not.toContain('SPACJA / DOTKNIJ, ABY POMINĄĆ');
    });
  });

  describe('voltage test decision', () => {
    it('gives the tested local player the discharge (D6) and Ground Wire buttons and a timer', () => {
      const html = renderDecision(op('Me', true, 2), true);

      expect(html).toContain('data-stage="decision"');
      expect(html).toContain('D6');
      expect(html).toContain('UŻYJ PRZEWODU UZIEMIAJĄCEGO');
      expect(html).toContain('discharge-timer');
    });

    it('hides Ground Wire when the tested player cannot use it', () => {
      const html = renderDecision(op('Me', true, 2), false);
      expect(html).toContain('D6');
      expect(html).not.toContain('UŻYJ PRZEWODU UZIEMIAJĄCEGO');
    });

    it('shows observers who is deciding, without any decision buttons', () => {
      const html = renderDecision(op('Bob', false, 2), true);

      expect(html).toContain('Bob decyduje…');
      expect(html).toContain('discharge-timer');
      expect(html).not.toContain('D6');
      expect(html).not.toContain('UŻYJ PRZEWODU UZIEMIAJĄCEGO');
    });
  });

  describe('discharge', () => {
    it('charges the capacitor on the target first, without spoiling the roll', () => {
      const html = renderDischarge(100);

      expect(html).toContain('data-stage="charge"');
      expect(html).toContain('Bob');
      expect(html).toContain('ŁADOWANIE KONDENSATORA');
      expect(html).toContain('zwarcie przy wyniku ≤ 2');
      expect(html).not.toContain('discharge-result');
      expect(html).not.toContain('IZOLACJA WYTRZYMAŁA');
    });

    it('rolls the d6 while the drum spins down, still without the result', () => {
      const html = renderDischarge(DISCHARGE_CHARGE_MS + 100);

      expect(html).toContain('data-stage="roll"');
      expect(html).toContain('RZUT K6');
      expect(html).not.toContain('discharge-result');
      expect(html).not.toContain('ryzyko teraz');
    });

    it('shows one compact result on the strike, with the new risk only when the target survived', () => {
      const survived = renderDischarge(dischargeStrikeDelayMs() + 10);
      expect(survived).toContain('data-stage="strike"');
      expect(survived).toContain('discharge-result');
      expect(survived).toContain('IZOLACJA WYTRZYMAŁA');
      expect(survived).toContain('ryzyko teraz 3/6');

      const shorted = renderDischarge(dischargeStrikeDelayMs() + 10, {
        roll: 1,
        overloaded: true,
      });
      expect(shorted).toContain('ZWARCIE // ELIMINACJA');
      expect(shorted).not.toContain('ryzyko teraz');
    });

    it('labels the local target as TY', () => {
      expect(renderDischarge(100, {}, op('Me', true))).toContain('>TY<');
    });
  });

  describe('variants', () => {
    it('keeps cards and chambers out of the slim bar: the 3D scene shows them', () => {
      const reveal = renderReveal(50);
      expect(reveal).toContain('data-variant="bar"');
      expect(reveal).not.toContain('showdown-card');
      expect(reveal).not.toContain('showdown-expanded');

      expect(renderDischarge(100)).not.toContain('showdown-expanded');
    });

    it('shows the cards face-down until they flip when WebGL is unavailable', () => {
      // Before the first card flips (TRACE_SUSPENSE_MS into the reveal).
      const scanning = renderReveal(-1200, {}, { variant: 'expanded' });
      expect(scanning).toContain('data-variant="expanded"');
      expect(scanning).toContain('showdown-expanded');
      expect(scanning).toContain('showdown-card');
      expect(scanning).not.toContain('data-flipped="true"');

      const verdict = renderReveal(50, {}, { variant: 'expanded' });
      expect(verdict).not.toContain('data-flipped="false"');
      expect(verdict).toContain('CORRUPTED');
    });
  });
});
