import { create } from 'zustand';

interface RulesModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useRulesModalStore = create<RulesModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
