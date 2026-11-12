import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { GameConnectionManager, GameConnectionOptions } from '../../../shared/realtime/gameConnection';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';

const captured: { options?: GameConnectionOptions } = {};
const invokeHubMethod = vi.fn();
const clearSession = vi.fn();
const getSession = vi.fn();

vi.mock('../../../shared/realtime/gameConnection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/realtime/gameConnection')>();
  return {
    ...actual,
    createGameConnection: (options?: GameConnectionOptions) => {
      captured.options = options;
      const fake: Pick<GameConnectionManager, 'invokeHubMethod' | 'clearSession' | 'getSession'> = {
        invokeHubMethod,
        clearSession,
        getSession,
      };
      return fake;
    },
  };
});

import {
  getSharedConnection,
  isSnapshotForCurrentRoom,
  resetSessionHookForTests,
  resumeSavedSession,
} from './useDebugTerminal';

const SESSION = { roomId: 'CYBER-1', sessionToken: '123e4567-e89b-12d3-a456-426614174000' };
const ID = '123e4567-e89b-12d3-a456-426614174001';
const snapshot = {
  roomCode: 'CYBER-1',
  state: 'Lobby',
  hostId: ID,
  myPlayerId: ID,
  myHand: [],
  seats: [],
  tablePileCount: 0,
  roundNumber: 0,
};

describe('session hook connection logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionHookForTests();
    useUiStore.setState({ toasts: [], connectionStatus: 'Disconnected' });
    useGameStore.getState().leaveRoom();
    getSession.mockReturnValue(SESSION);
  });

  it('invokes Reconnect and applies the snapshot after an automatic reconnect', async () => {
    invokeHubMethod.mockResolvedValue({ isSuccess: true, data: snapshot });
    getSharedConnection();
    await captured.options?.onReconnected?.('new-id');

    expect(invokeHubMethod).toHaveBeenCalledWith('Reconnect', expect.anything(), {
      roomCode: 'CYBER-1',
      sessionToken: SESSION.sessionToken,
    });
    expect(useUiStore.getState().connectionStatus).toBe('Connected');
    expect(useGameStore.getState().roomCode).toBe('CYBER-1');
  });

  it('tracks reconnecting and closed status', () => {
    getSharedConnection();
    captured.options?.onReconnecting?.();
    expect(useUiStore.getState().connectionStatus).toBe('Reconnecting');
    captured.options?.onClosed?.();
    expect(useUiStore.getState().connectionStatus).toBe('Disconnected');
  });

  it('pushes an error toast and resets session when startup resume fails', async () => {
    invokeHubMethod.mockResolvedValue({ isSuccess: false, error: 'Session expired' });
    const ok = await resumeSavedSession(getSharedConnection(), { resetOnFailure: true });

    expect(ok).toBe(false);
    expect(clearSession).toHaveBeenCalled();
    expect(useUiStore.getState().toasts[0]?.kind).toBe('error');
  });

  it('pushes an error toast on a contract violation', () => {
    getSharedConnection();
    captured.options?.onContractViolation?.('PlayerJoined', new z.ZodError([]), {});
    expect(useUiStore.getState().toasts).toHaveLength(1);
  });

  it('does nothing without a saved session', async () => {
    getSession.mockReturnValue(null);
    const ok = await resumeSavedSession(getSharedConnection(), { resetOnFailure: true });
    expect(ok).toBe(false);
    expect(invokeHubMethod).not.toHaveBeenCalled();
  });
});

describe('isSnapshotForCurrentRoom', () => {
  it('drops snapshots after the player left or for another room', () => {
    expect(isSnapshotForCurrentRoom(null, 'CYBER-1')).toBe(false);
    expect(isSnapshotForCurrentRoom('CYBER-2', 'CYBER-1')).toBe(false);
    expect(isSnapshotForCurrentRoom('CYBER-1', 'CYBER-1')).toBe(true);
  });
});
