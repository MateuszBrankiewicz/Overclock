import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useI18n } from '../../../shared/i18n';
import { REVEAL_CARD_STAGGER_MS } from '../utils/cinematicTiming';
import { TraceVerdictBanner } from './TraceVerdictBanner';

describe('TraceVerdictBanner (UX-01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useI18n.getState().setLanguage('pl');
  });

  it('remains hidden before all cards have finished flipping', () => {
    const startedAt = 10000;
    // Freeze time before reveal completes (startedAt + (2+1)*220 = 10660)
    vi.spyOn(Date, 'now').mockReturnValue(10500);

    const html = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: true,
        accuserNickname: 'Alice',
        accusedNickname: 'Bob',
        loserNickname: 'Bob',
        isLocalLoser: false,
        declaredProtocol: 'Alpha',
        startedAtMs: startedAt,
        cardCount: 2,
      })
    );

    expect(html).toBe('');
  });

  it('renders bluff detected variant with opponent loser subtitle in Polish', () => {
    const startedAt = 10000;
    // Set time after reveal completion
    vi.spyOn(Date, 'now').mockReturnValue(startedAt + 3 * REVEAL_CARD_STAGGER_MS + 50);

    const html = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: true,
        accuserNickname: 'Alice',
        accusedNickname: 'Bob',
        loserNickname: 'Bob',
        isLocalLoser: false,
        declaredProtocol: 'Alpha',
        startedAtMs: startedAt,
        cardCount: 2,
      })
    );

    expect(html).toContain('trace-verdict-banner');
    expect(html).toContain('BLEF WYKRYTY');
    expect(html).toContain('Bob idzie na test napięcia');
    expect(html).toContain('border-red-500');
  });

  it('renders clean transmission variant with emerald styling', () => {
    const startedAt = 10000;
    vi.spyOn(Date, 'now').mockReturnValue(startedAt + 2 * REVEAL_CARD_STAGGER_MS + 50);

    const html = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: false,
        accuserNickname: 'Alice',
        accusedNickname: 'Bob',
        loserNickname: 'Alice',
        isLocalLoser: false,
        declaredProtocol: 'Beta',
        startedAtMs: startedAt,
        cardCount: 1,
      })
    );

    expect(html).toContain('trace-verdict-banner');
    expect(html).toContain('CZYSTA TRANSMISJA');
    expect(html).toContain('Alice idzie na test napięcia');
    expect(html).toContain('border-emerald-400');
  });

  it('renders "TY idziesz na test napięcia" when local player is the loser', () => {
    const startedAt = 10000;
    vi.spyOn(Date, 'now').mockReturnValue(startedAt + 4 * REVEAL_CARD_STAGGER_MS + 50);

    const html = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: true,
        accuserNickname: 'Rival',
        accusedNickname: 'Me',
        loserNickname: 'Me',
        isLocalLoser: true,
        declaredProtocol: 'Gamma',
        startedAtMs: startedAt,
        cardCount: 3,
      })
    );

    expect(html).toContain('trace-verdict-banner');
    expect(html).toContain('TY idziesz na test napięcia');
  });

  it('correctly translates to English when language is set to EN', () => {
    useI18n.getState().setLanguage('en');
    const startedAt = 10000;
    vi.spyOn(Date, 'now').mockReturnValue(startedAt + 2000);

    const bluffHtml = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: true,
        accuserNickname: 'Rival',
        accusedNickname: 'Me',
        loserNickname: 'Me',
        isLocalLoser: true,
        declaredProtocol: 'Alpha',
        startedAtMs: startedAt,
        cardCount: 1,
      })
    );

    expect(bluffHtml).toContain('BLUFF DETECTED');
    expect(bluffHtml).toContain('YOU go to voltage test');

    const cleanHtml = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: false,
        accuserNickname: 'Rival',
        accusedNickname: 'Me',
        loserNickname: 'Rival',
        isLocalLoser: false,
        declaredProtocol: 'Alpha',
        startedAtMs: startedAt,
        cardCount: 1,
      })
    );

    expect(cleanHtml).toContain('CLEAN TRANSMISSION');
    expect(cleanHtml).toContain('Rival goes to voltage test');
  });

  it('renders skip prompt when onSkip is provided', () => {
    const startedAt = 10000;
    vi.spyOn(Date, 'now').mockReturnValue(startedAt + 2 * REVEAL_CARD_STAGGER_MS + 50);

    const html = renderToString(
      React.createElement(TraceVerdictBanner, {
        bluffDetected: true,
        accuserNickname: 'Alice',
        accusedNickname: 'Bob',
        loserNickname: 'Bob',
        isLocalLoser: false,
        declaredProtocol: 'Alpha',
        startedAtMs: startedAt,
        cardCount: 1,
        onSkip: () => {},
      })
    );

    expect(html).toContain('SPACE / TAP TO CONTINUE');
  });
});
