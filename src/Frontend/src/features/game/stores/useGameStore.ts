import { create } from 'zustand';
import type { Card, TraceCalledEvent, TurnStartedEvent } from '../schemas/gameEvents';

export interface RoomSlice {
  roomCode: string | null;
  playerId: string | null;
  isInRoom: boolean;
  setRoom: (roomCode: string, playerId: string) => void;
  leaveRoom: () => void;
}

export interface TurnSlice {
  activePlayerId: string | null;
  turnDeadlineUtc: string | null;
  currentVoltage: number;
  hand: Card[];
  lastTrace: TraceCalledEvent | null;
  setTurnStarted: (event: TurnStartedEvent) => void;
  setHand: (cards: Card[]) => void;
  applyTraceCalled: (event: TraceCalledEvent) => void;
  resetGame: () => void;
}

export type GameState = RoomSlice & TurnSlice;

export const useGameStore = create<GameState>((set) => ({
  // Room slice
  roomCode: null,
  playerId: null,
  isInRoom: false,
  setRoom: (roomCode, playerId) =>
    set({ roomCode, playerId, isInRoom: true }),
  leaveRoom: () =>
    set({
      roomCode: null,
      playerId: null,
      isInRoom: false,
      activePlayerId: null,
      turnDeadlineUtc: null,
      currentVoltage: 0,
      hand: [],
      lastTrace: null,
    }),

  // Turn slice
  activePlayerId: null,
  turnDeadlineUtc: null,
  currentVoltage: 0,
  hand: [],
  lastTrace: null,
  setTurnStarted: (event) =>
    set({
      activePlayerId: event.activePlayerId,
      turnDeadlineUtc: event.turnDeadlineUtc,
      currentVoltage: event.currentVoltage,
    }),
  setHand: (hand) => set({ hand }),
  applyTraceCalled: (event) =>
    set({
      lastTrace: event,
    }),
  resetGame: () =>
    set({
      activePlayerId: null,
      turnDeadlineUtc: null,
      currentVoltage: 0,
      hand: [],
      lastTrace: null,
    }),
}));
