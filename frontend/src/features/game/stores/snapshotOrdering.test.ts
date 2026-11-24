import { beforeEach, describe, expect, it } from 'vitest';

import type { RoomStateSnapshot } from '../schemas/gameEvents';
import { useGameStore } from './useGameStore';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function snapshot(overrides: Partial<RoomStateSnapshot>): RoomStateSnapshot {
  return {
    roomCode: 'CYBER-7X9',
    state: 'TurnActive',
    hostId: ME,
    myPlayerId: ME,
    myHand: [],
    seats: [
      { playerId: ME, nickname: 'Me', status: 'Active', isReady: true, handCount: 2 },
      { playerId: OTHER, nickname: 'Other', status: 'Active', isReady: true, handCount: 2 },
    ],
    tablePileCount: 0,
    currentTargetProtocol: 'Alpha',
    currentTurnPlayerId: ME,
    roundNumber: 1,
    winnerId: null,
    ...overrides,
  };
}

describe('applyRoomSnapshot ordering', () => {
  beforeEach(() => useGameStore.getState().leaveRoom());

  it('ignores a snapshot older than the one already applied', () => {
    const store = useGameStore.getState();
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 7, currentTurnPlayerId: OTHER, tablePileCount: 3 }));
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 5, currentTurnPlayerId: ME, tablePileCount: 1 }));

    const state = useGameStore.getState();
    expect(state.activePlayerId).toBe(OTHER);
    expect(state.tablePileCount).toBe(3);
  });

  it('applies a snapshot with the same sequence (state changed without a new event)', () => {
    const store = useGameStore.getState();
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 7, tablePileCount: 3 }));
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 7, tablePileCount: 4 }));

    expect(useGameStore.getState().tablePileCount).toBe(4);
  });

  it('accepts a lower sequence again after leaving the room', () => {
    const store = useGameStore.getState();
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 40 }));
    store.leaveRoom();
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 1, roomCode: 'CYBER-NEW', tablePileCount: 2 }));

    const state = useGameStore.getState();
    expect(state.roomCode).toBe('CYBER-NEW');
    expect(state.tablePileCount).toBe(2);
  });

  it('accepts a lower sequence from a different room', () => {
    const store = useGameStore.getState();
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 40 }));
    store.applyRoomSnapshot(snapshot({ sequenceNumber: 1, roomCode: 'CYBER-NEW' }));

    expect(useGameStore.getState().roomCode).toBe('CYBER-NEW');
  });
});
