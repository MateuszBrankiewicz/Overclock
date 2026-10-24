import type { StateCreator } from 'zustand';

import type { GameState, HandSlice } from '../types';

export const createHandSlice: StateCreator<GameState, [], [], HandSlice> = (set) => ({
  myCards: [],
  selectedCardIds: [],
  hand: [],

  setMyCards: (myCards) =>
    set((state) => ({
      myCards,
      selectedCardIds: state.selectedCardIds.filter((id) =>
        myCards.some((card) => card.id === id)
      ),
    })),

  setHand: (hand) => set({ hand }),

  toggleCardSelection: (cardId) =>
    set((state) => {
      const isCardInHand = state.myCards.some((card) => card.id === cardId);
      if (!isCardInHand) {
        return state;
      }

      if (state.selectedCardIds.includes(cardId)) {
        return {
          selectedCardIds: state.selectedCardIds.filter((id) => id !== cardId),
        };
      }

      if (state.selectedCardIds.length >= 3) {
        return state;
      }

      return {
        selectedCardIds: [...state.selectedCardIds, cardId],
      };
    }),

  selectCard: (cardId) =>
    set((state) => {
      const isCardInHand = state.myCards.some((card) => card.id === cardId);
      if (
        !isCardInHand ||
        state.selectedCardIds.includes(cardId) ||
        state.selectedCardIds.length >= 3
      ) {
        return state;
      }

      return {
        selectedCardIds: [...state.selectedCardIds, cardId],
      };
    }),

  deselectCard: (cardId) =>
    set((state) => {
      if (!state.selectedCardIds.includes(cardId)) {
        return state;
      }
      return {
        selectedCardIds: state.selectedCardIds.filter((id) => id !== cardId),
      };
    }),

  clearSelection: () =>
    set((state) => (state.selectedCardIds.length === 0 ? state : { selectedCardIds: [] })),
});

