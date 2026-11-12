import type { StateCreator } from 'zustand';

import { estimateTurnDeadlineUtc } from '../../utils/cinematicTiming';
import { startTraceReveal } from '../helpers/startTraceReveal';
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
  traceReveal: null,
  lastRevealedTraceSequence: null,
  roundIntro: null,

  clearRoundIntro: () => set({ roundIntro: null }),

  applyRoundStarted: (event) =>
    set({
      roundIntro: {
        roundNumber: event.roundNumber,
        protocol: event.leadProtocol ?? null,
        startedAtMs: Date.now(),
      },
      turnDeadlineUtc: estimateTurnDeadlineUtc(),
      roundNumber: event.roundNumber,
      roomState: 'TurnActive',
      currentTargetProtocol: event.leadProtocol ?? null,
      activePlayerId: event.activePlayerId ?? null,
      tablePileCount: 0,
      selectedCardIds: [],
      lastPlayedCards: null,
      lastTraceResolution: null,
      lastTrace: null,
      awaitingDischargeForSequence: null,
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
    set((state) => {
      const seq = resolution.sequenceNumber ?? null;
      // The accuser gets the same resolution twice (broadcast + invoke response): reveal once.
      const alreadyRevealed =
        (seq !== null && state.lastRevealedTraceSequence !== null && seq <= state.lastRevealedTraceSequence) ||
        (seq === null && state.traceReveal !== null);

      if (alreadyRevealed) {
        return {
          lastTraceResolution: resolution,
          tablePileCount: 0,
          turnDeadlineUtc: null,
          roomState: state.roomState === 'GameOver' ? 'GameOver' : 'RoundOver',
        };
      }

      return {
        ...startTraceReveal(state, resolution),
        roomState: state.roomState === 'GameOver' ? 'GameOver' : 'RoundOver',
      };
    }),

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
      traceReveal: null,
      awaitingDischargeForSequence: null,
      roundIntro: null,
    })),
});

