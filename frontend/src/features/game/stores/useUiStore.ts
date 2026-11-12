import { create } from 'zustand';

export type ConnectionStatus = 'Connected' | 'Connecting' | 'Reconnecting' | 'Disconnected' | 'Error';
export type ToastKind = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export const TOAST_TTL_MS = 4000;
export const MAX_TOASTS = 4;

interface UiState {
  connectionStatus: ConnectionStatus;
  toasts: Toast[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  pushToast: (toast: { kind: ToastKind; message: string }) => number;
  dismissToast: (id: number) => void;
}

let nextToastId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  connectionStatus: 'Disconnected',
  toasts: [],
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  pushToast: ({ kind, message }) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }].slice(-MAX_TOASTS) }));
    setTimeout(() => get().dismissToast(id), TOAST_TTL_MS);
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
