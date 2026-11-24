import { useI18n } from '../../../shared/i18n';
import { clearGameSession } from '../../../shared/realtime/gameConnection';
import { RoomJoinResultSchema, TraceResolutionSchema } from '../schemas/gameEvents';
import { useGameStore } from '../stores/useGameStore';
import { logSession } from '../stores/useSessionLog';
import { useUiStore } from '../stores/useUiStore';
import type { CharacterId } from '../utils/characterCatalog';
import { joinRoomOn, resumeSavedSession } from './roomSession';
import { errText, reportError, setConnectionStatus } from './sessionFeedback';
import { ensureConnected, peekSharedConnection } from './sharedConnection';

const LEAVE_ROOM_TIMEOUT_MS = 2000;

function fail(action: string, detail: string): void {
  logSession(`${action} failed: ${detail}`);
  reportError(useI18n.getState().t.network.actionFailed(action, detail));
}

function failureDetail(res: { error?: string | null; errorCode?: string | null }): string {
  return res.error ?? res.errorCode ?? 'Unknown error';
}

/**
 * Sends a fire-and-forget hub command for the current room, reporting failures as toasts.
 * Returns true when the hub accepted it.
 */
async function sendRoomCommand(
  method: string,
  buildArgs: (roomCode: string) => Record<string, unknown>,
  successLog: string
): Promise<boolean> {
  const roomCode = useGameStore.getState().roomCode;
  if (!roomCode) return false;
  try {
    const conn = await ensureConnected();
    const res = await conn.invokeHubCommand(method, buildArgs(roomCode));
    if (res.isSuccess) {
      logSession(successLog);
      return true;
    }
    fail(method, failureDetail(res));
  } catch (err) {
    fail(method, errText(err));
  }
  return false;
}

export async function createRoom(nickname: string, code?: string): Promise<void> {
  try {
    const conn = await ensureConnected();
    const preferredCharacterId = useGameStore.getState().selectedCharacterId;
    const res = await conn.invokeHubMethod('CreateRoom', RoomJoinResultSchema, {
      hostNickname: nickname,
      roomCode: code || null,
      preferredCharacterId,
    });
    if (res.isSuccess && res.data) {
      conn.saveSession({ roomId: res.data.roomCode, sessionToken: res.data.sessionToken });
      useGameStore.getState().applyRoomSnapshot(res.data.gameState);
      logSession(`Created room ${res.data.roomCode} as ${nickname}`);
    } else {
      fail('CreateRoom', failureDetail(res));
    }
  } catch (err) {
    fail('CreateRoom', errText(err));
  }
}

export async function joinRoom(targetRoomCode: string, nickname: string): Promise<void> {
  try {
    const conn = await ensureConnected();
    const error = await joinRoomOn(conn, targetRoomCode, nickname);
    if (error) {
      fail('JoinRoom', error);
    } else {
      logSession(`Joined room ${targetRoomCode} as ${nickname}`);
    }
  } catch (err) {
    fail('JoinRoom', errText(err));
  }
}

/** Optimistically selects a character; rolls back when the hub rejects it. */
export async function selectCharacter(characterId: CharacterId): Promise<void> {
  const previous = useGameStore.getState().selectedCharacterId;
  useGameStore.getState().setSelectedCharacter(characterId);
  if (!useGameStore.getState().roomCode) return;
  const accepted = await sendRoomCommand(
    'SelectCharacter',
    (roomCode) => ({ roomCode, characterId }),
    `SelectCharacter sent: characterId=${characterId}`
  );
  if (!accepted) useGameStore.getState().setSelectedCharacter(previous);
}

export async function setReady(isReady: boolean): Promise<void> {
  await sendRoomCommand(
    'SetReady',
    (roomCode) => ({ roomCode, isReady }),
    `SetReady sent: isReady=${isReady ? 'true' : 'false'}`
  );
}

export async function startRound(): Promise<void> {
  await sendRoomCommand('StartRound', (roomCode) => ({ roomCode }), 'StartRound sent');
}

export async function playCards(): Promise<void> {
  const state = useGameStore.getState();
  const cards = state.selectedCardIds;
  const targetProtocol = state.currentTargetProtocol ?? 'Alpha';
  if (cards.length === 0) return;
  const accepted = await sendRoomCommand(
    'PlayCards',
    (roomCode) => ({ roomCode, cardIds: cards, declaredProtocol: targetProtocol }),
    `PlayCards success: played ${cards.length} card(s) face-down as '${targetProtocol}'`
  );
  if (accepted) useGameStore.getState().clearSelection();
}

export async function callTrace(): Promise<void> {
  const roomCode = useGameStore.getState().roomCode;
  if (!roomCode) return;
  try {
    const conn = await ensureConnected();
    const res = await conn.invokeHubMethod('CallTrace', TraceResolutionSchema, { roomCode });
    if (res.isSuccess && res.data) {
      useGameStore.getState().applyTraceResolution(res.data);
      logSession(`CallTrace sent: BluffDetected=${res.data.bluffDetected ? 'true' : 'false'}`);
    } else {
      fail('CallTrace', failureDetail(res));
    }
  } catch (err) {
    fail('CallTrace', errText(err));
  }
}

export async function activateExploit(exploit: string, newTargetProtocol?: string): Promise<void> {
  await sendRoomCommand(
    'ActivateExploit',
    (roomCode) => ({ roomCode, exploit, newTargetProtocol: newTargetProtocol ?? null }),
    `ActivateExploit success: ${exploit}`
  );
}

export async function triggerDischarge(): Promise<void> {
  await sendRoomCommand(
    'TriggerDischarge',
    (roomCode) => ({ roomCode }),
    'TriggerDischarge success: capacitor discharged'
  );
}

/** Tells the hub we are leaving (bounded by a timeout), then always clears the local session. */
export async function leaveRoom(): Promise<void> {
  const conn = peekSharedConnection();
  const activeRoomCode = useGameStore.getState().roomCode;
  if (activeRoomCode && conn?.isConnected) {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const invokePromise = conn.invokeHubCommand('LeaveRoom', { roomCode: activeRoomCode });
      const timeoutPromise = new Promise<{ isSuccess: boolean }>((resolve) => {
        timer = setTimeout(() => resolve({ isSuccess: false }), LEAVE_ROOM_TIMEOUT_MS);
      });
      try {
        await Promise.race([invokePromise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (err) {
      logSession(`LeaveRoom invoke warning: ${errText(err)}`);
    }
  }

  if (conn) {
    conn.clearSession();
  } else {
    clearGameSession();
  }
  useGameStore.getState().leaveRoom();
  useUiStore.getState().clearFeed();
}

/** Debug: restarts the socket and re-attaches the saved session. */
export async function reconnect(): Promise<void> {
  const conn = peekSharedConnection();
  if (!conn) return;
  if (!conn.getSession()) {
    logSession('No active session saved in sessionStorage to reconnect');
    return;
  }
  try {
    await conn.start();
    if (conn.isConnected) setConnectionStatus('Connected');
  } catch (err) {
    fail('Reconnect', errText(err));
    return;
  }
  const resumed = await resumeSavedSession(conn, { resetOnFailure: false });
  if (resumed) logSession('Reconnected successfully');
}
