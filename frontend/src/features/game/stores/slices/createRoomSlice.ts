import type { StateCreator } from 'zustand';

import type { PlayerSeat } from '../../schemas/gameEvents';
import type { CharacterId } from '../../utils/characterCatalog';
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

export const createRoomSlice: StateCreator<GameState, [], [], RoomSlice> = (set) => ({
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
  canActivateExploit: false,
  lastDischargeOutcome: null,
  dischargeCinematic: null,
  sniffedCard: null,
  selectedCharacterId: getInitialCharacterId(),
  characterByPlayerId: {},
  cameraFocus: 'overview',

  clearDischargeCinematic: () => set({ dischargeCinematic: null }),

  setSelectedCharacter: (characterId) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('overclock_character', characterId);
    }
    set((state) => ({
      selectedCharacterId: characterId,
      characterByPlayerId: state.playerId
        ? { ...state.characterByPlayerId, [state.playerId]: characterId }
        : state.characterByPlayerId,
    }));
  },

  setPlayerCharacter: (playerId, characterId) =>
    set((state) => ({
      characterByPlayerId: {
        ...state.characterByPlayerId,
        [playerId]: characterId,
      },
    })),

  setCameraFocus: (focus) =>
    set({
      cameraFocus: focus,
    }),

  setRoom: (roomCode, playerId) =>
    set((state) => ({
      roomCode,
      playerId,
      isInRoom: true,
      characterByPlayerId: {
        ...state.characterByPlayerId,
        [playerId]: state.selectedCharacterId,
      },
    })),

  applyRoomSnapshot: (snapshot) =>
    set((state) => {
      const shouldClearSniffedCard =
        snapshot.state !== 'TurnActive' ||
        snapshot.currentTurnPlayerId !== state.activePlayerId ||
        snapshot.roundNumber !== state.roundNumber;

      const shouldClearLastDischarge =
        snapshot.state === 'TurnActive' ||
        snapshot.state === 'Lobby' ||
        snapshot.state === 'VoltageTest';

      const shouldClearTraceResolution =
        snapshot.state === 'TurnActive' ||
        snapshot.state === 'Lobby' ||
        snapshot.state === 'GameOver' ||
        snapshot.state === 'VoltageTest';

      return {
        roomCode: snapshot.roomCode,
        roomState: snapshot.state,
        hostId: snapshot.hostId,
        playerId: snapshot.myPlayerId,
        isInRoom: true,
        players: snapshot.seats,
        winnerId: snapshot.winnerId ?? null,
        placementByPlayerId:
          snapshot.state === 'Lobby' || (state.roomState === 'GameOver' && snapshot.state !== 'GameOver')
            ? {}
            : state.placementByPlayerId,
        pendingDischargePlayerId: snapshot.pendingDischargePlayerId ?? null,
        dischargeDeadlineUtc:
          snapshot.dischargeDeadlineUtc ??
          (snapshot.state === 'VoltageTest' ? state.dischargeDeadlineUtc : null),
        canActivateExploit: snapshot.canActivateExploit ?? false,
        lastDischargeOutcome: shouldClearLastDischarge ? null : state.lastDischargeOutcome,
        sniffedCard: shouldClearSniffedCard ? null : state.sniffedCard,
        myCards: snapshot.myHand,
        selectedCardIds: state.selectedCardIds.filter((id) =>
          snapshot.myHand.some((card) => card.id === id)
        ),
        tablePileCount: snapshot.tablePileCount,
        currentTargetProtocol: snapshot.currentTargetProtocol ?? null,
        activePlayerId: snapshot.currentTurnPlayerId ?? null,
        roundNumber: snapshot.roundNumber,
        lastTraceResolution: shouldClearTraceResolution
          ? null
          : (snapshot.lastTraceResolution ?? state.lastTraceResolution),
        lastPlayedCards: null,
        lastTrace: null,
      };
    }),

  applyPlayerJoined: (event) =>
    set((state) => {
      const incoming: PlayerSeat = 'player' in event ? event.player : event;
      const existingIndex = state.players.findIndex(
        (seat) => seat.playerId === incoming.playerId
      );

      if (existingIndex >= 0) {
        const nextPlayers = [...state.players];
        nextPlayers[existingIndex] = incoming;
        return { players: nextPlayers };
      }

      return { players: [...state.players, incoming] };
    }),

  applyPlayerStatusChanged: (event) =>
    set((state) => ({
      players: state.players.map((seat) =>
        seat.playerId === event.playerId ? { ...seat, status: event.status } : seat
      ),
    })),

  applyCapacitorDischarged: (event) =>
    set((state) => {
      if (
        state.dischargeCinematic &&
        event.sequenceNumber !== undefined &&
        state.dischargeCinematic.event.sequenceNumber === event.sequenceNumber
      ) {
        return state;
      }
      return {
        lastDischargeOutcome: event,
        dischargeCinematic: {
          event,
          startedAtMs: Date.now(),
        },
        pendingDischargePlayerId: null,
        dischargeDeadlineUtc: null,
        players: state.players.map((seat) =>
          seat.playerId === event.playerId
            ? {
                ...seat,
                riskLevel: event.resultingRiskLevel,
                status: event.overloaded ? 'Eliminated' : seat.status,
              }
            : seat
        ),
      };
    }),

  applyPlayerEliminated: (event) =>
    set((state) => ({
      placementByPlayerId: {
        ...state.placementByPlayerId,
        [event.playerId]: event.placement,
      },
      players: state.players.map((seat) =>
        seat.playerId === event.playerId
          ? { ...seat, status: 'Eliminated' }
          : seat
      ),
    })),

  applyExploitTriggered: (event) =>
    set((state) => ({
      currentTargetProtocol: event.newTargetProtocol ?? state.currentTargetProtocol,
      turnDeadlineUtc: event.turnDeadlineUtc ?? state.turnDeadlineUtc,
      tablePileCount: event.exploit === 'EmpFlare' ? 0 : state.tablePileCount,
      sniffedCard: event.exploit === 'EmpFlare' ? null : state.sniffedCard,
      players: state.players.map((seat) =>
        seat.playerId === event.playerId
          ? {
              ...seat,
              riskLevel: event.newRiskLevel ?? seat.riskLevel,
              exploit: seat.exploit ? { ...seat.exploit, isBurned: true } : seat.exploit,
            }
          : seat
      ),
    })),

  applyPacketSniffed: (event) =>
    set({
      sniffedCard: event.card,
    }),

  applyVoltageTestStarted: (event) =>
    set({
      roomState: 'VoltageTest',
      pendingDischargePlayerId: event.pendingPlayerId,
      dischargeDeadlineUtc: event.decisionDeadlineUtc ?? null,
      lastDischargeOutcome: null,
    }),

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
      canActivateExploit: false,
      lastDischargeOutcome: null,
      dischargeCinematic: null,
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

