import { useI18n } from '../../../shared/i18n';
import type { GameConnectionManager } from '../../../shared/realtime/gameConnection';
import { PlayerGameStateSchema, RoomJoinResultSchema } from '../schemas/gameEvents';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { readRoomParam } from '../utils/invite';
import { loadSavedNickname } from '../utils/nickname';
import { errText, reportError } from './sessionFeedback';

/**
 * Re-attaches the current connection to the saved room via the hub `Reconnect` method.
 * Does not start the connection. Returns true when the room snapshot was applied.
 */
export async function resumeSavedSession(
  conn: Pick<GameConnectionManager, 'getSession' | 'invokeHubMethod' | 'clearSession'>,
  options: { resetOnFailure: boolean }
): Promise<boolean> {
  const session = conn.getSession();
  if (!session) return false;
  const net = useI18n.getState().t.network;
  const abort = () => {
    if (!options.resetOnFailure) return;
    conn.clearSession();
    useGameStore.getState().leaveRoom();
    useUiStore.getState().clearFeed();
  };
  try {
    const res = await conn.invokeHubMethod('Reconnect', PlayerGameStateSchema, {
      roomCode: session.roomId,
      sessionToken: session.sessionToken,
    });
    if (res.isSuccess && res.data) {
      useGameStore.getState().applyRoomSnapshot(res.data);
      return true;
    }
    reportError(net.actionFailed('Reconnect', res.error ?? res.errorCode ?? net.reconnectFailed));
    abort();
  } catch (err) {
    reportError(net.actionFailed('Reconnect', errText(err)));
    abort();
  }
  return false;
}

/**
 * Invokes the hub `JoinRoom` method and applies the result to the stores.
 * Returns null on success, or the failure detail reported by the hub.
 */
export async function joinRoomOn(
  conn: Pick<GameConnectionManager, 'invokeHubMethod' | 'saveSession'>,
  targetRoomCode: string,
  nickname: string
): Promise<string | null> {
  const preferredCharacterId = useGameStore.getState().selectedCharacterId;
  const res = await conn.invokeHubMethod('JoinRoom', RoomJoinResultSchema, {
    roomCode: targetRoomCode,
    nickname,
    preferredCharacterId,
  });
  if (res.isSuccess && res.data) {
    conn.saveSession({ roomId: res.data.roomCode, sessionToken: res.data.sessionToken });
    useGameStore.getState().applyRoomSnapshot(res.data.gameState);
    return null;
  }
  return res.error ?? res.errorCode ?? 'Unknown error';
}

/**
 * Joins the room named by the `?room=` invite link. With a saved nickname the join is immediate;
 * without one the lobby is asked to prompt for a nickname first (`inviteJoin.needsNickname`).
 */
export async function autoJoinFromInvite(
  conn: Pick<GameConnectionManager, 'invokeHubMethod' | 'saveSession'>,
  search: string = typeof window === 'undefined' ? '' : window.location.search
): Promise<void> {
  const roomCode = readRoomParam(search);
  if (!roomCode || useGameStore.getState().isInRoom) return;
  const { setInviteJoin } = useUiStore.getState();
  const nickname = loadSavedNickname();
  if (!nickname) {
    setInviteJoin({ roomCode, status: 'needsNickname' });
    return;
  }
  setInviteJoin({ roomCode, status: 'joining' });
  const net = useI18n.getState().t.network;
  try {
    const error = await joinRoomOn(conn, roomCode, nickname);
    if (error) reportError(net.actionFailed('JoinRoom', error));
  } catch (err) {
    reportError(net.actionFailed('JoinRoom', errText(err)));
  } finally {
    setInviteJoin(null);
  }
}
