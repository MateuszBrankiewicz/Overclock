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

  applyVoltageOverloaded: (event) =>
    set((state) => ({
      currentVoltage: event.finalVoltage,
      players: state.players.map((seat) =>
        seat.playerId === event.eliminatedPlayerId
          ? { ...seat, status: 'Eliminated' }
          : seat
      ),
    })),

  leaveRoom: () =>
    set({
      roomCode: null,
      roomState: null,
      hostId: null,
      playerId: null,
      isInRoom: false,
      players: [],
      winnerId: null,
      myCards: [],
      selectedCardIds: [],
      hand: [],
      roundNumber: 0,
      activePlayerId: null,
      currentTargetProtocol: null,
      tablePileCount: 0,
      remainingTimeSeconds: 15,
      turnDeadlineUtc: null,
      currentVoltage: 0,
      lastPlayedCards: null,
      lastTraceResolution: null,
      lastTrace: null,
    }),
});

