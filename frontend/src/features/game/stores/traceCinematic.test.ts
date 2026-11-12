import { beforeEach, describe, expect, it } from 'vitest';

import type {
  CapacitorDischargedEvent,
  CardsPlayedEvent,
  PlayerSeat,
  RoomStateSnapshot,
  TraceResolution,
} from '../schemas/gameEvents';
import { traceRevealDurationMs,TURN_DURATION_SECONDS } from '../utils/cinematicTiming';
import { useGameStore } from './useGameStore';

const ME = '11111111-1111-4111-8111-111111111111';
const RIVAL = '22222222-2222-4222-8222-222222222222';

const seats: PlayerSeat[] = [
  { playerId: ME, nickname: 'Me', status: 'Active', isReady: true, handCount: 3, riskLevel: 1 },
  { playerId: RIVAL, nickname: 'Rival', status: 'Active', isReady: true, handCount: 3, riskLevel: 1 },
];

function snapshot(overrides: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot {
  return {
    roomCode: 'CYBER-1',
    state: 'TurnActive',
    hostId: ME,
    myPlayerId: ME,
    myHand: [],
    seats,
    tablePileCount: 0,
    currentTurnPlayerId: ME,
    roundNumber: 1,
    ...overrides,
  };
}

const resolution: TraceResolution = {
  accuserPlayerId: ME,
  accusedPlayerId: RIVAL,
  loserPlayerId: RIVAL,
  revealedCards: [
    { id: 'c1', protocol: 'Corrupted' },
    { id: 'c2', protocol: 'Alpha' },
  ],
  declaredProtocol: 'Alpha',
  bluffDetected: true,
  sequenceNumber: 7,
};

const discharge: CapacitorDischargedEvent = {
  type: 'CapacitorDischarged',
  roomCode: 'CYBER-1',
  playerId: RIVAL,
  roll: 2,
  riskLevel: 1,
  resultingRiskLevel: 2,
  overloaded: false,
  sequenceNumber: 8,
};

describe('trace -> reveal -> discharge sequencing', () => {
  beforeEach(() => {
    useGameStore.getState().leaveRoom();
    useGameStore.getState().applyRoomSnapshot(snapshot());
  });

  it('starts a card reveal with the seats as they were when the trace resolved', () => {
    useGameStore.getState().applyTraceResolution(resolution);
    const state = useGameStore.getState();

    expect(state.traceReveal?.resolution).toEqual(resolution);
    expect(state.traceReveal?.seatsAtReveal).toEqual(seats);
    expect(state.turnDeadlineUtc).toBeNull();
  });

  it('ignores a duplicate resolution with the same sequence number', () => {
    useGameStore.getState().applyTraceResolution(resolution);
    const first = useGameStore.getState().traceReveal;
    useGameStore.getState().applyTraceResolution(resolution);

    expect(useGameStore.getState().traceReveal).toBe(first);
  });

  it('holds the discharge until the reveal finishes, then plays it', () => {
    useGameStore.getState().applyTraceResolution(resolution);
    useGameStore.getState().applyCapacitorDischarged(discharge);

    let state = useGameStore.getState();
    expect(state.dischargeCinematic).toBeNull();
    expect(state.queuedDischarge).toEqual(discharge);

    useGameStore.getState().finishTraceReveal();
    state = useGameStore.getState();
    expect(state.traceReveal).toBeNull();
    expect(state.queuedDischarge).toBeNull();
    expect(state.dischargeCinematic?.event).toEqual(discharge);
    expect(state.lastDischargeOutcome).toEqual(discharge);
    expect(state.players.find((p) => p.playerId === RIVAL)?.riskLevel).toBe(2);
  });

  it('plays a discharge immediately when no reveal is running', () => {
    useGameStore.getState().applyCapacitorDischarged(discharge);
    expect(useGameStore.getState().dischargeCinematic?.event).toEqual(discharge);
  });

  it('reveal duration grows with the number of revealed cards', () => {
    expect(traceRevealDurationMs(3)).toBeGreaterThan(traceRevealDurationMs(1));
  });
});

describe('snapshots during a round', () => {
  beforeEach(() => {
    useGameStore.getState().leaveRoom();
  });

  it('keeps the last play after the follow-up snapshot so the card flight can run', () => {
    useGameStore.getState().applyRoomSnapshot(snapshot());
    const played: CardsPlayedEvent = { playerId: ME, cardCount: 2, declaredProtocol: 'Alpha' };
    useGameStore.getState().applyCardsPlayed(played);
    const lastPlay = useGameStore.getState().lastPlayedCards;
    expect(lastPlay).not.toBeNull();

    useGameStore.getState().applyRoomSnapshot(snapshot({ currentTurnPlayerId: RIVAL, tablePileCount: 2 }));
    expect(useGameStore.getState().lastPlayedCards).toBe(lastPlay);

    useGameStore.getState().applyRoomSnapshot(snapshot({ roundNumber: 2 }));
    expect(useGameStore.getState().lastPlayedCards).toBeNull();
  });

  it('estimates a turn deadline when a turn starts and keeps it for the same turn', () => {
    const before = Date.now();
    useGameStore.getState().applyRoomSnapshot(snapshot());
    const deadline = useGameStore.getState().turnDeadlineUtc;
    expect(deadline).not.toBeNull();
    const deadlineMs = new Date(deadline ?? '').getTime();
    expect(deadlineMs).toBeGreaterThanOrEqual(before + TURN_DURATION_SECONDS * 1000);

    useGameStore.getState().applyRoomSnapshot(snapshot({ tablePileCount: 1 }));
    expect(useGameStore.getState().turnDeadlineUtc).toBe(deadline);

    useGameStore.getState().applyRoomSnapshot(snapshot({ state: 'RoundOver' }));
    expect(useGameStore.getState().turnDeadlineUtc).toBeNull();
  });

  it('announces the round and its protocol on RoundStarted', () => {
    useGameStore.getState().applyRoundStarted({ roomCode: 'CYBER-1', roundNumber: 3, leadProtocol: 'Gamma' });
    const intro = useGameStore.getState().roundIntro;
    expect(intro).toMatchObject({ roundNumber: 3, protocol: 'Gamma' });

    useGameStore.getState().clearRoundIntro();
    expect(useGameStore.getState().roundIntro).toBeNull();
  });
});
