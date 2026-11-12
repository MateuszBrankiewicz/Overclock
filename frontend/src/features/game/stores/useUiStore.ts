import { create } from 'zustand';

import type { FeedEntry } from '../utils/formatFeedEvent';

export type ConnectionStatus = 'Connected' | 'Connecting' | 'Reconnecting' | 'Disconnected' | 'Error';
export type ToastKind = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export const TOAST_TTL_MS = 4000;
export const MAX_TOASTS = 4;
export const MAX_FEED_ENTRIES = 20;

interface UiState {
  connectionStatus: ConnectionStatus;
  toasts: Toast[];
  feed: FeedEntry[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  pushToast: (toast: { kind: ToastKind; message: string }) => number;
  dismissToast: (id: number) => void;
  pushFeedEntry: (entry: Omit<FeedEntry, 'id'>) => void;
  clearFeed: () => void;
}

let nextToastId = 1;
let nextFeedId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  connectionStatus: 'Disconnected',
  toasts: [],
  feed: [],
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  pushToast: ({ kind, message }) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }].slice(-MAX_TOASTS) }));
    setTimeout(() => get().dismissToast(id), TOAST_TTL_MS);
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  pushFeedEntry: (entry) =>
    set((state) => ({ feed: [...state.feed, { ...entry, id: nextFeedId++ }].slice(-MAX_FEED_ENTRIES) })),
  clearFeed: () => set({ feed: [] }),
}));
