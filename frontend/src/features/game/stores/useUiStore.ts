import { create } from 'zustand';

import type { FeedEntry } from '../utils/formatFeedEvent';

export type ConnectionStatus = 'Connected' | 'Connecting' | 'Reconnecting' | 'Disconnected' | 'Error';
export type ToastKind = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Joining a room from an invite link: in flight, or waiting for the player to pick a nickname. */
export interface InviteJoin {
  roomCode: string;
  status: 'joining' | 'needsNickname';
}

export const TOAST_TTL_MS = 4000;
export const MAX_TOASTS = 4;
export const MAX_FEED_ENTRIES = 20;

const STREAMER_STORAGE_KEY = 'overclock_streamer_mode';

interface StreamerPrefs {
  maskRoomCode: boolean;
  holdToRevealCards: boolean;
}

function loadStreamerPrefs(): StreamerPrefs {
  if (typeof window === 'undefined') {
    return { maskRoomCode: false, holdToRevealCards: false };
  }
  try {
    const raw = window.localStorage.getItem(STREAMER_STORAGE_KEY);
    if (!raw) return { maskRoomCode: false, holdToRevealCards: false };
    const parsed = JSON.parse(raw) as Partial<StreamerPrefs>;
    return {
      maskRoomCode: Boolean(parsed.maskRoomCode),
      holdToRevealCards: Boolean(parsed.holdToRevealCards),
    };
  } catch {
    return { maskRoomCode: false, holdToRevealCards: false };
  }
}

function saveStreamerPrefs(prefs: StreamerPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STREAMER_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota/privacy mode failures
  }
}

export function formatDisplayRoomCode(roomCode: string, maskRoomCode: boolean): string {
  if (!maskRoomCode) return roomCode;
  const dashIndex = roomCode.indexOf('-');
  if (dashIndex > 0) {
    return `${roomCode.slice(0, dashIndex + 1)}***`;
  }
  return '***';
}

interface UiState {
  connectionStatus: ConnectionStatus;
  toasts: Toast[];
  feed: FeedEntry[];
  inviteJoin: InviteJoin | null;
  setInviteJoin: (inviteJoin: InviteJoin | null) => void;
  maskRoomCode: boolean;
  holdToRevealCards: boolean;
  isHandRevealed: boolean;
  setConnectionStatus: (status: ConnectionStatus) => void;
  pushToast: (toast: { kind: ToastKind; message: string }) => number;
  dismissToast: (id: number) => void;
  pushFeedEntry: (entry: Omit<FeedEntry, 'id'>) => void;
  clearFeed: () => void;
  setMaskRoomCode: (enabled: boolean) => void;
  setHoldToRevealCards: (enabled: boolean) => void;
  setHandRevealed: (revealed: boolean) => void;
}

let nextToastId = 1;
let nextFeedId = 1;

const initialPrefs = loadStreamerPrefs();

export const useUiStore = create<UiState>((set, get) => ({
  connectionStatus: 'Disconnected',
  toasts: [],
  feed: [],
  inviteJoin: null,
  setInviteJoin: (inviteJoin) => set({ inviteJoin }),
  maskRoomCode: initialPrefs.maskRoomCode,
  holdToRevealCards: initialPrefs.holdToRevealCards,
  isHandRevealed: false,
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
  setMaskRoomCode: (maskRoomCode) => {
    saveStreamerPrefs({ maskRoomCode, holdToRevealCards: get().holdToRevealCards });
    set({ maskRoomCode });
  },
  setHoldToRevealCards: (holdToRevealCards) => {
    saveStreamerPrefs({ maskRoomCode: get().maskRoomCode, holdToRevealCards });
    set({ holdToRevealCards, isHandRevealed: false });
  },
  setHandRevealed: (isHandRevealed) => set({ isHandRevealed }),
}));
