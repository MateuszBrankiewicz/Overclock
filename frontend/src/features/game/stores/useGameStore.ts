import { create } from 'zustand';

import { createHandSlice } from './slices/createHandSlice';
import { createRoomSlice } from './slices/createRoomSlice';
import { createTurnSlice } from './slices/createTurnSlice';
import type { GameState } from './types';

export * from './types';

export const useGameStore = create<GameState>()((...args) => ({
  ...createRoomSlice(...args),
  ...createHandSlice(...args),
  ...createTurnSlice(...args),
}));