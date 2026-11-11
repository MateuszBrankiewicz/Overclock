import { create } from 'zustand';

export type QueuedActionType =
  | 'ReceiveGameState'
  | 'CardsPlayed'
  | 'TraceCalled'
  | 'RoundStarted'
  | 'PlayerStatusChanged'
  | 'PlayerJoined'
  | 'CapacitorDischarged'
  | 'PlayerEliminated'
  | 'ExploitTriggered'
  | 'PacketSniffed'
  | 'VoltageTestStarted';

export interface QueuedGameAction {
  id: string;
  type: QueuedActionType;
  sequenceNumber: number;
  payload: unknown;
  minDurationMs: number;
  enqueuedAt: number;
}

export interface ActionQueueState {
  queue: QueuedGameAction[];
  activeAction: QueuedGameAction | null;
  lastSequenceNumber: number;
  isProcessing: boolean;
  enqueueAction: (
    type: QueuedActionType,
    payload: unknown,
    options?: { sequenceNumber?: number; minDurationMs?: number }
  ) => void;
  completeCurrentAction: () => void;
  resetQueue: () => void;
}

let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let minDurationTimer: ReturnType<typeof setTimeout> | null = null;
let canComplete = true;

const WATCHDOG_TIMEOUT_MS = 2000;
const DEFAULT_MIN_DURATION_MS = 300;

export const useActionQueue = create<ActionQueueState>((set, get) => {
  const clearAllTimers = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    if (minDurationTimer) {
      clearTimeout(minDurationTimer);
      minDurationTimer = null;
    }
  };

  const processNext = () => {
    clearAllTimers();
    const state = get();
    if (state.queue.length === 0) {
      set({ activeAction: null, isProcessing: false });
      return;
    }

    const [nextAction, ...remainingQueue] = state.queue;
    canComplete = false;

    set({
      activeAction: nextAction,
      queue: remainingQueue,
      isProcessing: true,
      lastSequenceNumber: Math.max(state.lastSequenceNumber, nextAction.sequenceNumber),
    });

    minDurationTimer = setTimeout(() => {
      canComplete = true;
    }, nextAction.minDurationMs);

    watchdogTimer = setTimeout(() => {
      const currentActive = get().activeAction;
      if (currentActive && currentActive.id === nextAction.id) {
        processNext();
      }
    }, WATCHDOG_TIMEOUT_MS);
  };

  return {
    queue: [],
    activeAction: null,
    lastSequenceNumber: 0,
    isProcessing: false,

    enqueueAction: (type, payload, options) => {
      const minDuration = options?.minDurationMs ?? DEFAULT_MIN_DURATION_MS;
      const sequenceNumber = options?.sequenceNumber ?? get().lastSequenceNumber + 1;

      const action: QueuedGameAction = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        sequenceNumber,
        payload,
        minDurationMs: minDuration,
        enqueuedAt: Date.now(),
      };

      set((prev) => ({
        queue: [...prev.queue, action],
      }));

      if (!get().isProcessing) {
        processNext();
      }
    },

    completeCurrentAction: () => {
      const { activeAction } = get();
      if (!activeAction) return;

      if (!canComplete) {
        // If animation completed before minDuration elapsed, schedule next right after minDuration
        const remaining = Math.max(0, activeAction.minDurationMs - (Date.now() - activeAction.enqueuedAt));
        clearAllTimers();
        watchdogTimer = setTimeout(() => {
          processNext();
        }, remaining);
        return;
      }

      processNext();
    },

    resetQueue: () => {
      clearAllTimers();
      canComplete = true;
      set({
        queue: [],
        activeAction: null,
        lastSequenceNumber: 0,
        isProcessing: false,
      });
    },
  };
});

