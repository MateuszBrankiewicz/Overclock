import type { StateCreator } from 'zustand';

import { playSfx } from '../../../../shared/lib/audio';
import { vibrate } from '../../../../shared/lib/haptics';
import type { GameState, HandSlice } from '../types';

export const createHandSlice: StateCreator<GameState, [], [], HandSlice> = (set, get) => ({
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

  toggleCardSelection: (cardId) => {
    const state = get();
    const isCardInHand = state.myCards.some((card) => card.id === cardId);
    if (!isCardInHand) {
      return;
    }

    const isAlreadySelected = state.selectedCardIds.includes(cardId);
    if (!isAlreadySelected && state.selectedCardIds.length >= 3) {
      return;
    }

    const willBeSelected = !isAlreadySelected;
    set({
      selectedCardIds: willBeSelected
        ? [...state.selectedCardIds, cardId]
        : state.selectedCardIds.filter((id) => id !== cardId),
    });

    playSfx('cardSelect', { selected: willBeSelected });
    vibrate('select');
  },

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

