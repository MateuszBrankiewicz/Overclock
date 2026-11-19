import { describe, expect, it } from 'vitest';

import type { CapacitorDischargedEvent, PlayerSeat } from '../../schemas/gameEvents';
import {
  applyCapacitorDischargedReducer,
  applyPlayerEliminatedReducer,
  applyPlayerJoinedReducer,
  applyPlayerStatusChangedReducer,
  finishTraceRevealReducer,
} from './roomReducers';

const seat = (playerId: string, overrides: Partial<PlayerSeat> = {}): PlayerSeat => ({
  playerId,
  nickname: playerId,
  status: 'Active',
  isReady: false,
  handCount: 5,
  ...overrides,
});

const discharge = (
  overrides: Partial<CapacitorDischargedEvent> = {}
): CapacitorDischargedEvent => ({
  type: 'CapacitorDischarged',
  roomCode: 'CYBER-7X9',
  playerId: 'a',
  roll: 3,
  riskLevel: 2,
  resultingRiskLevel: 3,
  overloaded: false,
  ...overrides,
});

describe('roomReducers', () => {
  it('appends a new seat and replaces an existing one on join', () => {
    const a = seat('a');
    const joined = applyPlayerJoinedReducer({ players: [] }, a);
    expect(joined.players).toEqual([a]);

    const readyA = { ...a, isReady: true };
    const replaced = applyPlayerJoinedReducer({ players: [a, seat('b')] }, readyA);
    expect(replaced.players).toHaveLength(2);
    expect(replaced.players?.[0]).toEqual(readyA);
  });

  it('changes only the matching seat status', () => {
    const patch = applyPlayerStatusChangedReducer(
      { players: [seat('a'), seat('b')] },
      { playerId: 'b', status: 'Disconnected' }
    );
    expect(patch.players?.map((p) => p.status)).toEqual(['Active', 'Disconnected']);
  });

  it('records placement and eliminates the seat', () => {
    const patch = applyPlayerEliminatedReducer(
      { players: [seat('a')], placementByPlayerId: { z: 1 } },
      { type: 'PlayerEliminated', roomCode: 'R', playerId: 'a', placement: 2 }
    );
    expect(patch.placementByPlayerId).toEqual({ z: 1, a: 2 });
    expect(patch.players?.[0].status).toBe('Eliminated');
  });

  it('applies a discharge immediately when no reveal is running', () => {
    const event = discharge({ overloaded: true });
    const patch = applyCapacitorDischargedReducer(
      { players: [seat('a')], dischargeCinematic: null, queuedDischarge: null, traceReveal: null },
      event,
      1234
    );
    expect(patch.dischargeCinematic).toEqual({ event, startedAtMs: 1234 });
    expect(patch.players?.[0]).toMatchObject({ riskLevel: 3, status: 'Eliminated' });
  });

  it('ignores a duplicate discharge sequence', () => {
    const event = discharge({ sequenceNumber: 7 });
    const patch = applyCapacitorDischargedReducer(
      {
        players: [seat('a')],
        dischargeCinematic: { event, startedAtMs: 1 },
        queuedDischarge: null,
        traceReveal: null,
      },
      event
    );
    expect(patch).toEqual({});
  });

  it('queues the discharge behind a running reveal and starts it when the reveal ends', () => {
    const reveal = {} as NonNullable<Parameters<typeof finishTraceRevealReducer>[0]['traceReveal']>;
    const event = discharge();
    const queued = applyCapacitorDischargedReducer(
      { players: [seat('a')], dischargeCinematic: null, queuedDischarge: null, traceReveal: reveal },
      event
    );
    expect(queued).toEqual({
      queuedDischarge: event,
      pendingDischargePlayerId: null,
      dischargeDeadlineUtc: null,
    });

    const finished = finishTraceRevealReducer(
      { players: [seat('a')], traceReveal: reveal, queuedDischarge: event },
      99
    );
    expect(finished.traceReveal).toBeNull();
    expect(finished.queuedDischarge).toBeNull();
    expect(finished.dischargeCinematic?.startedAtMs).toBe(99);
  });
});
