import { describe, expect, it } from 'vitest';

import { translations } from '../../../shared/i18n';
import type { PlayerSeat } from '../schemas/gameEvents';
import { type FeedContext, formatFeedEvent } from './formatFeedEvent';

const A = '123e4567-e89b-12d3-a456-426614174001';
const B = '123e4567-e89b-12d3-a456-426614174002';
const C = '123e4567-e89b-12d3-a456-426614174003';

const players: PlayerSeat[] = [
  { playerId: A, nickname: 'Volt', status: 'Active', isReady: true, handCount: 3 },
  { playerId: B, nickname: 'Ghost', status: 'Active', isReady: true, handCount: 3 },
];

const ctx = (localPlayerId: string | null = null, lang: 'en' | 'pl' = 'en'): FeedContext => ({
  players,
  localPlayerId,
  t: translations[lang].feed,
});

describe('formatFeedEvent', () => {
  it('formats cards played', () => {
    expect(
      formatFeedEvent({ kind: 'CardsPlayed', event: { playerId: A, cardCount: 2, declaredProtocol: 'Alpha' } }, ctx())
    ).toEqual({ text: 'Volt played 2× ALPHA', tone: 'neutral' });
  });

  it('formats trace using the accuser', () => {
    const res = formatFeedEvent(
      {
        kind: 'TraceCalled',
        event: {
          accuserPlayerId: B,
          accusedPlayerId: A,
          loserPlayerId: A,
          revealedCards: [],
          declaredProtocol: 'Beta',
          bluffDetected: true,
        },
      },
      ctx()
    );
    expect(res).toEqual({ text: 'Ghost calls TRACE!', tone: 'danger' });
  });

  it('formats exploit usage', () => {
    const res = formatFeedEvent(
      { kind: 'ExploitTriggered', event: { type: 'ExploitTriggered', roomCode: 'R', playerId: B, exploit: 'EmpFlare' } },
      ctx()
    );
    expect(res).toEqual({ text: 'Ghost used EMP FLARE', tone: 'info' });
  });

  it('formats survived and overloaded discharges', () => {
    const base = { type: 'CapacitorDischarged' as const, roomCode: 'R', playerId: A, roll: 4, riskLevel: 1, resultingRiskLevel: 2 };
    expect(formatFeedEvent({ kind: 'CapacitorDischarged', event: { ...base, overloaded: false } }, ctx())).toEqual({
      text: 'Volt survived the discharge (roll 4)',
      tone: 'success',
    });
    expect(formatFeedEvent({ kind: 'CapacitorDischarged', event: { ...base, overloaded: true } }, ctx())).toEqual({
      text: 'Volt overloaded! (roll 4)',
      tone: 'danger',
    });
  });

  it('formats elimination and round start', () => {
    expect(
      formatFeedEvent({ kind: 'PlayerEliminated', event: { type: 'PlayerEliminated', roomCode: 'R', playerId: B, placement: 3 } }, ctx())
    ).toEqual({ text: 'Ghost eliminated — #3', tone: 'danger' });
    expect(formatFeedEvent({ kind: 'RoundStarted', event: { roomCode: 'R', roundNumber: 2 } }, ctx())).toEqual({
      text: 'Round 2 started',
      tone: 'info',
    });
  });

  it('shows the local player as You / Ty', () => {
    const event = { playerId: A, cardCount: 1, declaredProtocol: 'Gamma' as const };
    expect(formatFeedEvent({ kind: 'CardsPlayed', event }, ctx(A)).text).toBe('You played 1× GAMMA');
    expect(formatFeedEvent({ kind: 'CardsPlayed', event }, ctx(A, 'pl')).text).toBe('Ty zagrywa 1× GAMMA');
  });

  it('falls back for unknown players', () => {
    const event = { playerId: C, cardCount: 1, declaredProtocol: 'Alpha' as const };
    expect(formatFeedEvent({ kind: 'CardsPlayed', event }, ctx()).text).toBe('Unknown played 1× ALPHA');
  });
});
