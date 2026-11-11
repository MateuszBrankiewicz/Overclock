import type { StateCreator } from 'zustand';

import type { GameState, TurnSlice } from '../types';

export const createTurnSlice: StateCreator<GameState, [], [], TurnSlice> = (set) => ({
  roundNumber: 0,
  activePlayerId: null,
  currentTargetProtocol: null,
  tablePileCount: 0,
  remainingTimeSeconds: 15,
  turnDeadlineUtc: null,
  lastPlayedCards: null,
  lastTraceResolution: null,
  lastTrace: null,

  applyRoundStarted: (event) =>
    set({
      roundNumber: event.roundNumber,
      roomState: 'TurnActive',
      currentTargetProtocol: event.leadProtocol ?? null,
      activePlayerId: event.activePlayerId ?? null,
      tablePileCount: 0,
      selectedCardIds: [],
      lastPlayedCards: null,
      lastTraceResolution: null,
      lastTrace: null,
      remainingTimeSeconds: 15,
    }),

  applyCardsPlayed: (event) =>
    set((state) => {
      const isSelf = state.playerId === event.playerId;
      const canPruneSelectedCards = isSelf && state.selectedCardIds.length === event.cardCount;

      return {
        currentTargetProtocol: state.currentTargetProtocol ?? event.declaredProtocol,
        tablePileCount: state.tablePileCount + event.cardCount,
        lastPlayedCards: event,
        players: state.players.map((seat) =>
          seat.playerId === event.playerId
            ? {
                ...seat,
                handCount: Math.max(0, seat.handCount - event.cardCount),
              }
            : seat
        ),
        // Optimistically prune played cards if selected card count matches the event payload.
        // Full hand state is authoritatively synced via applyRoomSnapshot.
        myCards: canPruneSelectedCards
          ? state.myCards.filter((card) => !state.selectedCardIds.includes(card.id))
          : state.myCards,
        selectedCardIds: isSelf ? [] : state.selectedCardIds,
      };
    }),

  applyTraceResolution: (resolution) =>
    set((state) => ({
      lastTraceResolution: resolution,
      tablePileCount: 0,
      roomState: state.roomState === 'GameOver' ? 'GameOver' : 'RoundOver',
    })),

  setTurnStarted: (event) => {
    let diffSeconds = 15;
    if (event.turnDeadlineUtc) {
      const deadline = new Date(event.turnDeadlineUtc).getTime();
      if (Number.isFinite(deadline)) {
        diffSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      }
    }

    set({
      activePlayerId: event.activePlayerId,
      turnDeadlineUtc: event.turnDeadlineUtc,
      remainingTimeSeconds: diffSeconds,
      roomState: 'TurnActive',
    });
  },

  applyTraceCalled: (event) =>
    set({
      lastTrace: event,
      roomState: 'BluffCheck',
    }),

  setRemainingTime: (seconds) =>
    set({
      remainingTimeSeconds: Math.max(0, seconds),
    }),

  tickRemainingTime: () =>
    set((state) => ({
      remainingTimeSeconds: Math.max(0, state.remainingTimeSeconds - 1),
    })),

  resetGame: () =>
    set((state) => ({
      roomState: state.roomCode ? 'Lobby' : null,
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
      lastPlayedCards: null,
      lastTraceResolution: null,
      lastTrace: null,
    })),
});

