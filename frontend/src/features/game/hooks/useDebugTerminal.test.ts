import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { GameConnectionManager, GameConnectionOptions } from '../../../shared/realtime/gameConnection';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';

const captured: { options?: GameConnectionOptions } = {};
const invokeHubMethod = vi.fn();
const invokeHubCommand = vi.fn();
const clearSession = vi.fn();
const getSession = vi.fn();
const saveSession = vi.fn();

vi.mock('../../../shared/realtime/gameConnection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/realtime/gameConnection')>();
  return {
    ...actual,
    createGameConnection: (options?: GameConnectionOptions) => {
      captured.options = options;
      const fake: Pick<
        GameConnectionManager,
        'invokeHubMethod' | 'invokeHubCommand' | 'clearSession' | 'getSession' | 'saveSession'
      > = {
        invokeHubMethod,
        invokeHubCommand,
        clearSession,
        getSession,
        saveSession,
      };
      return fake;
    },
  };
});

import {
  autoJoinFromInvite,
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

describe('autoJoinFromInvite', () => {
  const joinResult = { roomCode: 'CYBER-1', sessionToken: SESSION.sessionToken, gameState: snapshot };
  const stubSavedNickname = (nickname: string | null) =>
    vi.stubGlobal('localStorage', { getItem: () => nickname });

  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionHookForTests();
    useUiStore.setState({ toasts: [], inviteJoin: null });
    useGameStore.getState().leaveRoom();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('joins the invited room straight away with the saved nickname', async () => {
    stubSavedNickname('Volt');
    invokeHubMethod.mockResolvedValue({ isSuccess: true, data: joinResult });

    await autoJoinFromInvite(getSharedConnection(), '?room=cyber-1');

    expect(invokeHubMethod).toHaveBeenCalledTimes(1);
    expect(invokeHubMethod).toHaveBeenCalledWith(
      'JoinRoom',
      expect.anything(),
      expect.objectContaining({ roomCode: 'CYBER-1', nickname: 'Volt' })
    );
    expect(saveSession).toHaveBeenCalledWith({
      roomId: 'CYBER-1',
      sessionToken: SESSION.sessionToken,
    });
    expect(useGameStore.getState().roomCode).toBe('CYBER-1');
    expect(useUiStore.getState().inviteJoin).toBeNull();
  });

  it('asks for a nickname instead of joining when none is saved', async () => {
    stubSavedNickname(null);

    await autoJoinFromInvite(getSharedConnection(), '?room=CYBER-1');

    expect(invokeHubMethod).not.toHaveBeenCalled();
    expect(useUiStore.getState().inviteJoin).toEqual({
      roomCode: 'CYBER-1',
      status: 'needsNickname',
    });
  });

  it('does nothing without a room parameter', async () => {
    stubSavedNickname('Volt');

    await autoJoinFromInvite(getSharedConnection(), '');

    expect(invokeHubMethod).not.toHaveBeenCalled();
    expect(useUiStore.getState().inviteJoin).toBeNull();
  });

  it('does not join again when the player is already in a room', async () => {
    stubSavedNickname('Volt');
    useGameStore.getState().setRoom('CYBER-9', ID);

    await autoJoinFromInvite(getSharedConnection(), '?room=CYBER-1');

    expect(invokeHubMethod).not.toHaveBeenCalled();
  });

  it('reports a failed join and stays in the lobby', async () => {
    stubSavedNickname('Volt');
    invokeHubMethod.mockResolvedValue({ isSuccess: false, errorCode: 'Room.NotFound' });

    await autoJoinFromInvite(getSharedConnection(), '?room=CYBER-1');

    expect(useGameStore.getState().roomCode).toBeNull();
    expect(useUiStore.getState().toasts[0]?.kind).toBe('error');
    expect(useUiStore.getState().inviteJoin).toBeNull();
  });
});

describe('isSnapshotForCurrentRoom', () => {
  it('drops snapshots after the player left or for another room', () => {
    expect(isSnapshotForCurrentRoom(null, 'CYBER-1')).toBe(false);
    expect(isSnapshotForCurrentRoom('CYBER-2', 'CYBER-1')).toBe(false);
    expect(isSnapshotForCurrentRoom('CYBER-1', 'CYBER-1')).toBe(true);
  });
});
