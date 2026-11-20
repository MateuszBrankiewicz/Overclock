import type { StateCreator } from 'zustand';

import { playSfx } from '../../../../shared/lib/audio';
import { vibrate } from '../../../../shared/lib/haptics';
import type { CharacterId } from '../../utils/characterCatalog';
import {
  applyCapacitorDischargedReducer,
  applyExploitTriggeredReducer,
  applyPacketSniffedReducer,
  applyPlayerEliminatedReducer,
  applyPlayerJoinedReducer,
  applyPlayerStatusChangedReducer,
  applyVoltageTestStartedReducer,
  finishTraceRevealReducer,
} from '../reducers/roomReducers';
import { applyRoomSnapshotReducer } from '../reducers/snapshotReducer';
import type { GameState, RoomSlice } from '../types';

const getInitialCharacterId = (): CharacterId => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('overclock_character');
      if (saved === 'ghost' || saved === 'volt' || saved === 'proxy' || saved === 'null') {
        return saved;
      }
    } catch {
      // storage blocked: use default character
    }
  }
  return 'ghost';
};

export const createRoomSlice: StateCreator<GameState, [], [], RoomSlice> = (set, get) => ({
  roomCode: null,
  roomState: null,
  hostId: null,
  playerId: null,
  isInRoom: false,
  players: [],
  winnerId: null,
  placementByPlayerId: {},
  pendingDischargePlayerId: null,
  dischargeDeadlineUtc: null,
  intermissionDeadlineUtc: null,
  canActivateExploit: false,
  lastDischargeOutcome: null,
  dischargeCinematic: null,
  queuedDischarge: null,
  awaitingDischargeForSequence: null,
  sniffedCard: null,
  selectedCharacterId: getInitialCharacterId(),
  cameraFocus: 'overview',
  spectatorTargetPlayerId: null,

  clearDischargeCinematic: () => set({ dischargeCinematic: null, showdownTrace: null }),
  clearAwaitingDischarge: () => set({ awaitingDischargeForSequence: null, showdownTrace: null }),

  finishTraceReveal: () =>
    set((state) => (state.traceReveal ? finishTraceRevealReducer(state) : state)),

  setSelectedCharacter: (characterId) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('overclock_character', characterId);
    }
    set({ selectedCharacterId: characterId });
  },

  setCameraFocus: (focus) =>
    set({
      cameraFocus: focus,
    }),

  setSpectatorTarget: (playerId) =>
    set({
      spectatorTargetPlayerId: playerId,
    }),

  setRoom: (roomCode, playerId) =>
    set({
      roomCode,
      playerId,
      isInRoom: true,
    }),

  applyRoomSnapshot: (snapshot) => {
    const prevState = get();
    const isLocalTurnStarting =
      snapshot.state === 'TurnActive' &&
      Boolean(snapshot.myPlayerId) &&
      snapshot.currentTurnPlayerId === snapshot.myPlayerId &&
      (prevState.activePlayerId !== snapshot.myPlayerId || prevState.roomState !== 'TurnActive');

    const isLocalVictory =
      snapshot.state === 'GameOver' &&
      prevState.roomState !== 'GameOver' &&
      Boolean(snapshot.myPlayerId) &&
      snapshot.winnerId === snapshot.myPlayerId;

    if (isLocalTurnStarting) {
      playSfx('yourTurn');
      vibrate('turn');
    }
    if (isLocalVictory) {
      playSfx('victory');
    }

    set((state) => applyRoomSnapshotReducer(state, snapshot));
  },

  applyPlayerJoined: (event) => set((state) => applyPlayerJoinedReducer(state, event)),

  applyPlayerStatusChanged: (event) =>
    set((state) => applyPlayerStatusChangedReducer(state, event)),

  applyCapacitorDischarged: (event) =>
    set((state) => {
      const patch = applyCapacitorDischargedReducer(state, event);
      return Object.keys(patch).length === 0 ? state : patch;
    }),

  applyPlayerEliminated: (event) => set((state) => applyPlayerEliminatedReducer(state, event)),

  applyExploitTriggered: (event) => set((state) => applyExploitTriggeredReducer(state, event)),

  applyPacketSniffed: (event) => set(applyPacketSniffedReducer(event)),

  applyVoltageTestStarted: (event) => set(applyVoltageTestStartedReducer(event)),

  leaveRoom: () =>
    set({
      roomCode: null,
      roomState: null,
      hostId: null,
      playerId: null,
      isInRoom: false,
      players: [],
      winnerId: null,
      placementByPlayerId: {},
      pendingDischargePlayerId: null,
      dischargeDeadlineUtc: null,
      intermissionDeadlineUtc: null,
      canActivateExploit: false,
      lastDischargeOutcome: null,
      dischargeCinematic: null,
      queuedDischarge: null,
      awaitingDischargeForSequence: null,
      traceReveal: null,
      showdownTrace: null,
      lastRevealedTraceSequence: null,
      spectatorTargetPlayerId: null,
      roundIntro: null,
      sniffedCard: null,
      myCards: [],
      selectedCardIds: [],
      hand: [],
      roundNumber: 0,
      activePlayerId: null,
      currentTargetProtocol: null,
      tablePileCount: 0,
      remainingTimeSeconds: 15,
      turnDeadlineUtc: null,
      lastPlayedCards: null,
      lastTraceResolution: null,
      lastTrace: null,
    }),
});

