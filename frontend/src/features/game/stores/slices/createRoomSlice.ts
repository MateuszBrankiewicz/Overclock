import type { StateCreator } from 'zustand';

import type { PlayerSeat } from '../../schemas/gameEvents';
import type { GameState, RoomSlice } from '../types';

export const createRoomSlice: StateCreator<GameState, [], [], RoomSlice> = (set) => ({
  roomCode: null,
  roomState: null,
  hostId: null,
  playerId: null,
  isInRoom: false,
  players: [],
  winnerId: null,
  pendingDischargePlayerId: null,
  dischargeDeadlineUtc: null,
  canActivateExploit: false,
  lastDischargeOutcome: null,
  sniffedCard: null,

  setRoom: (roomCode, playerId) =>
    set({
      roomCode,
      playerId,
      isInRoom: true,
    }),

  applyRoomSnapshot: (snapshot) =>
    set((state) => ({
      roomCode: snapshot.roomCode,
      roomState: snapshot.state,
      hostId: snapshot.hostId,
      playerId: snapshot.myPlayerId,
      isInRoom: true,
      players: snapshot.seats,
      winnerId: snapshot.winnerId ?? null,
      pendingDischargePlayerId: snapshot.pendingDischargePlayerId ?? null,
      dischargeDeadlineUtc: snapshot.dischargeDeadlineUtc ?? null,
      canActivateExploit: snapshot.canActivateExploit ?? false,
      myCards: snapshot.myHand,
      selectedCardIds: state.selectedCardIds.filter((id) =>
        snapshot.myHand.some((card) => card.id === id)
      ),
      tablePileCount: snapshot.tablePileCount,
      currentTargetProtocol: snapshot.currentTargetProtocol ?? null,
      activePlayerId: snapshot.currentTurnPlayerId ?? null,
      roundNumber: snapshot.roundNumber,
      lastTraceResolution: snapshot.lastTraceResolution ?? null,
      lastPlayedCards: null,
      lastTrace: null,
    })),

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
    set((state) => ({
      lastDischargeOutcome: event,
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
    })),

  applyPlayerEliminated: (event) =>
    set((state) => ({
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
      pendingDischargePlayerId: null,
      dischargeDeadlineUtc: null,
      canActivateExploit: false,
      lastDischargeOutcome: null,
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

