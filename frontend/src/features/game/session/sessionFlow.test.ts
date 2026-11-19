import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

import type { GameConnectionOptions } from '../../../shared/realtime/gameConnection';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';

vi.mock('../../../shared/lib/audio', () => ({
  playSfx: vi.fn(),
  setGameAudioHum: vi.fn(),
  speakRobotVoice: vi.fn(),
  useAudioSettings: { getState: () => ({ voiceEnabled: false }) },
}));

type Listener = (raw: unknown) => void;
const listeners = new Map<string, Set<Listener>>();
const invokeHubMethod = vi.fn();

/** Minimal in-memory hub: `on` validates with the given schema like the real manager does. */
vi.mock('../../../shared/realtime/gameConnection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/realtime/gameConnection')>();
  return {
    ...actual,
    createGameConnection: (_options?: GameConnectionOptions) => ({
      isConnected: true,
      start: vi.fn(),
      getSession: () => null,
      saveSession: vi.fn(),
      clearSession: vi.fn(),
      invokeHubMethod,
      invokeHubCommand: vi.fn(),
      on: <T>(eventName: string, schema: z.ZodType<T>, handler: (payload: T) => void) => {
        const listener: Listener = (raw) => {
          const parsed = schema.safeParse(raw);
          if (parsed.success) handler(parsed.data);
        };
        const set = listeners.get(eventName) ?? new Set<Listener>();
        set.add(listener);
        listeners.set(eventName, set);
        return () => set.delete(listener);
      },
    }),
  };
});

import { resetGameHandlersForTests, retainGameHandlers } from './registerGameHandlers';
import { joinRoom } from './sessionCommands';
import { getSharedConnection, resetSharedConnectionForTests } from './sharedConnection';

const ME = '123e4567-e89b-12d3-a456-426614174001';
const OTHER = '123e4567-e89b-12d3-a456-426614174002';
const TOKEN = '123e4567-e89b-12d3-a456-426614174000';

function emit(eventName: string, payload: unknown): void {
  listeners.get(eventName)?.forEach((listener) => listener(payload));
}

const seat = (playerId: string, nickname: string, seatIndex: number) => ({
  playerId,
  nickname,
  seatIndex,
  status: 'Connected',
  riskLevel: 1,
  cardCount: 5,
  isReady: true,
});

describe('realtime session flow', () => {
  beforeEach(() => {
    listeners.clear();
    invokeHubMethod.mockReset();
    resetSharedConnectionForTests();
    resetGameHandlersForTests();
    useGameStore.getState().leaveRoom();
    useUiStore.setState({ feed: [], toasts: [] });
  });

  afterEach(() => resetGameHandlersForTests());

  it('join → snapshot → server event is applied exactly once with lobby and table both mounted', async () => {
    const conn = getSharedConnection();
    // OperatingTable and LobbyScreen each mount the session hook while in the lobby.
    const releaseTable = retainGameHandlers(conn);
    const releaseLobby = retainGameHandlers(conn);

    invokeHubMethod.mockResolvedValueOnce({
      isSuccess: true,
      data: {
        roomCode: 'CYBER-1',
        playerId: ME,
        sessionToken: TOKEN,
        gameState: {
          roomCode: 'CYBER-1',
          state: 'Playing',
          hostId: ME,
          myPlayerId: ME,
          myHand: [],
          seats: [seat(ME, 'me', 0), seat(OTHER, 'rival', 1)],
          tablePileCount: 0,
          roundNumber: 1,
        },
      },
    });
    await joinRoom('CYBER-1', 'me');
    expect(useGameStore.getState().roomCode).toBe('CYBER-1');
    expect(useUiStore.getState().toasts).toEqual([]);

    emit('CardsPlayed', { playerId: OTHER, cardCount: 2, declaredProtocol: 'Alpha', sequenceNumber: 7 });
    expect(useUiStore.getState().feed).toHaveLength(1);

    releaseLobby();
    emit('CardsPlayed', { playerId: OTHER, cardCount: 1, declaredProtocol: 'Alpha', sequenceNumber: 8 });
    expect(useUiStore.getState().feed).toHaveLength(2);

    releaseTable();
    emit('CardsPlayed', { playerId: OTHER, cardCount: 1, declaredProtocol: 'Alpha', sequenceNumber: 9 });
    expect(useUiStore.getState().feed).toHaveLength(2);
  });
});
