import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { vibrate } from '../../../shared/lib/haptics';
import {
  clearGameSession,
  createGameConnection,
  GameConnectionManager,
} from '../../../shared/realtime/gameConnection';
import {
  CapacitorDischargedEventSchema,
  type CardProtocol,
  CardsPlayedEventSchema,
  ExploitTriggeredEventSchema,
  PacketSniffedEventSchema,
  PlayerEliminatedEventSchema,
  PlayerGameStateSchema,
  PlayerJoinedEventSchema,
  PlayerStatusChangedEventSchema,
  RoomJoinResultSchema,
  RoomStateSnapshotSchema,
  RoundStartedEventSchema,
  TraceResolutionSchema,
  VoltageTestStartedEventSchema,
} from '../schemas/gameEvents';
import { useActionQueue } from '../stores/useActionQueue';
import { useGameStore } from '../stores/useGameStore';
import { type ConnectionStatus, useUiStore } from '../stores/useUiStore';
import { type FeedSource, formatFeedEvent } from '../utils/formatFeedEvent';

let sharedConnection: GameConnectionManager | null = null;
let startupResumeAttempted = false;
let pendingStart: Promise<void> | null = null;

/** Test helper: allows re-running the one-time startup session resume. */
export function resetSessionHookForTests(): void {
  sharedConnection = null;
  startupResumeAttempted = false;
  pendingStart = null;
}

function setConnectionStatus(status: ConnectionStatus): void {
  useUiStore.getState().setConnectionStatus(status);
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Side effects of a validated game event, run after the store apply:
 * appends a human-readable feed entry and triggers haptics for the local player.
 */
export function recordGameEvent(source: FeedSource): void {
  const { players, playerId } = useGameStore.getState();
  const ui = useUiStore.getState();
  if (source.kind === 'RoundStarted' && source.event.roundNumber === 1) ui.clearFeed();
  ui.pushFeedEntry(
    formatFeedEvent(source, { players, localPlayerId: playerId, t: useI18n.getState().t.feed })
  );
  if (source.kind === 'CapacitorDischarged' && source.event.playerId === playerId) {
    vibrate(source.event.overloaded ? 'overload' : 'shock');
  } else if (source.kind === 'PlayerEliminated' && source.event.playerId === playerId) {
    vibrate('overload');
  }
}

function reportError(message: string): void {
  useUiStore.getState().pushToast({ kind: 'error', message });
}

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

/** Lazily creates the app-wide SignalR connection wired to the UI store. */
export function getSharedConnection(log: (msg: string) => void = () => undefined): GameConnectionManager {
  if (sharedConnection) return sharedConnection;
  const created: GameConnectionManager = createGameConnection({
    onReconnecting: () => setConnectionStatus('Reconnecting'),
    onReconnected: async () => {
      setConnectionStatus('Connected');
      await resumeSavedSession(created, { resetOnFailure: false });
    },
    onClosed: () => setConnectionStatus('Disconnected'),
    onContractViolation: (eventName, error) => {
      log(`Contract Violation in ${eventName}: ${error.message}`);
      reportError(`${useI18n.getState().t.network.contractViolation} (${eventName})`);
    },
  });
  sharedConnection = created;
  return created;
}

export function useGameSession() {
  const connectionStatus = useUiStore((state) => state.connectionStatus);
  const [lastLog, setLastLog] = useState<string>('Terminal initialized');

  const roomCode = useGameStore((state) => state.roomCode);
  const isInRoom = useGameStore((state) => state.isInRoom);
  const currentTargetProtocol = useGameStore((state) => state.currentTargetProtocol);
  const applyRoomSnapshot = useGameStore((state) => state.applyRoomSnapshot);
  const applyPlayerJoined = useGameStore((state) => state.applyPlayerJoined);
  const applyPlayerStatusChanged = useGameStore((state) => state.applyPlayerStatusChanged);
  const applyCardsPlayed = useGameStore((state) => state.applyCardsPlayed);
  const applyTraceResolution = useGameStore((state) => state.applyTraceResolution);
  const applyRoundStarted = useGameStore((state) => state.applyRoundStarted);
  const applyCapacitorDischarged = useGameStore((state) => state.applyCapacitorDischarged);
  const applyPlayerEliminated = useGameStore((state) => state.applyPlayerEliminated);
  const applyExploitTriggered = useGameStore((state) => state.applyExploitTriggered);
  const applyPacketSniffed = useGameStore((state) => state.applyPacketSniffed);
  const applyVoltageTestStarted = useGameStore((state) => state.applyVoltageTestStarted);
  const leaveRoomLocal = useGameStore((state) => state.leaveRoom);

  const [customProtocol, setCustomProtocol] = useState<CardProtocol | null>(null);
  const selectedProtocol = customProtocol ?? currentTargetProtocol ?? 'Alpha';

  const setSelectedProtocol = useCallback((protocol: CardProtocol) => {
    setCustomProtocol(protocol);
  }, []);

  const logMessage = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLastLog(`[${timestamp}] ${msg}`);
  }, []);

  const fail = useCallback(
    (action: string, detail: string) => {
      logMessage(`${action} failed: ${detail}`);
      reportError(useI18n.getState().t.network.actionFailed(action, detail));
    },
    [logMessage]
  );

  const leaveRoom = useCallback(() => {
    if (sharedConnection) {
      sharedConnection.clearSession();
    } else {
      clearGameSession();
    }
    leaveRoomLocal();
    useUiStore.getState().clearFeed();
  }, [leaveRoomLocal]);

  useEffect(() => {
    const conn = getSharedConnection(logMessage);

    const unsubs = [
      conn.on('ReceiveGameState', RoomStateSnapshotSchema, (snapshot) => {
        useActionQueue.getState().enqueueAction(
          'ReceiveGameState',
          snapshot,
          { sequenceNumber: snapshot.sequenceNumber, minDurationMs: 100 }
        );
        applyRoomSnapshot(snapshot);
        logMessage(`ReceiveGameState received: State=${snapshot.state}`);
      }),
      conn.on('PlayerJoined', PlayerJoinedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'PlayerJoined',
          event,
          { minDurationMs: 100 }
        );
        applyPlayerJoined(event);
        logMessage('PlayerJoined event received');
      }),
      conn.on('PlayerStatusChanged', PlayerStatusChangedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'PlayerStatusChanged',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 150 }
        );
        applyPlayerStatusChanged(event);
        logMessage(`PlayerStatusChanged: ${event.playerId} -> ${event.status}`);
      }),
      conn.on('CardsPlayed', CardsPlayedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'CardsPlayed',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 350 }
        );
        applyCardsPlayed(event);
        recordGameEvent({ kind: 'CardsPlayed', event: event });
        logMessage(`CardsPlayed: count=${event.cardCount}, protocol=${event.declaredProtocol}`);
      }),
      conn.on('TraceCalled', TraceResolutionSchema, (resolution) => {
        useActionQueue.getState().enqueueAction(
          'TraceCalled',
          resolution,
          { sequenceNumber: resolution.sequenceNumber, minDurationMs: 600 }
        );
        applyTraceResolution(resolution);
        recordGameEvent({ kind: 'TraceCalled', event: resolution });
        logMessage(`TraceCalled: bluffDetected=${resolution.bluffDetected ? 'true' : 'false'}`);
      }),
      conn.on('RoundStarted', RoundStartedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'RoundStarted',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 250 }
        );
        applyRoundStarted(event);
        recordGameEvent({ kind: 'RoundStarted', event: event });
        logMessage(`RoundStarted: round ${event.roundNumber}, lead=${event.leadProtocol ?? 'none'}`);
      }),
      conn.on('CapacitorDischarged', CapacitorDischargedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'CapacitorDischarged',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 400 }
        );
        applyCapacitorDischarged(event);
        recordGameEvent({ kind: 'CapacitorDischarged', event: event });
        logMessage(`CapacitorDischarged: player=${event.playerId}, roll=${event.roll}, risk=${event.riskLevel}->${event.resultingRiskLevel}, overloaded=${event.overloaded}`);
      }),
      conn.on('PlayerEliminated', PlayerEliminatedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'PlayerEliminated',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 500 }
        );
        applyPlayerEliminated(event);
        recordGameEvent({ kind: 'PlayerEliminated', event: event });
        logMessage(`PlayerEliminated: player=${event.playerId}, placement=#${event.placement}`);
      }),
      conn.on('ExploitTriggered', ExploitTriggeredEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'ExploitTriggered',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 350 }
        );
        applyExploitTriggered(event);
        recordGameEvent({ kind: 'ExploitTriggered', event: event });
        logMessage(`ExploitTriggered: player=${event.playerId}, exploit=${event.exploit}`);
      }),
      conn.on('PacketSniffed', PacketSniffedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'PacketSniffed',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 300 }
        );
        applyPacketSniffed(event);
        logMessage(`PacketSniffed: peeked card protocol=${event.card.protocol}`);
      }),
      conn.on('VoltageTestStarted', VoltageTestStartedEventSchema, (event) => {
        useActionQueue.getState().enqueueAction(
          'VoltageTestStarted',
          event,
          { sequenceNumber: event.sequenceNumber, minDurationMs: 300 }
        );
        applyVoltageTestStarted(event);
        logMessage(`VoltageTestStarted: pending=${event.pendingPlayerId}`);
      }),
    ];

    if (!conn.isConnected) {
      setConnectionStatus('Connecting');
      pendingStart ??= conn.start();
      void pendingStart
        .then(async () => {
          pendingStart = null;
          setConnectionStatus('Connected');
          logMessage('Connected to SignalR GameHub');
          if (!startupResumeAttempted) {
            startupResumeAttempted = true;
            const resumed = await resumeSavedSession(conn, { resetOnFailure: true });
            if (resumed) logMessage('Session resumed after page load');
          }
        })
        .catch((err: unknown) => {
          pendingStart = null;
          setConnectionStatus('Error');
          logMessage(`Failed to connect: ${errText(err)}`);
          reportError(useI18n.getState().t.network.connectionError);
        });
    } else {
      startupResumeAttempted = true;
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [
    applyCapacitorDischarged,
    applyCardsPlayed,
    applyExploitTriggered,
    applyPacketSniffed,
    applyPlayerEliminated,
    applyPlayerJoined,
    applyPlayerStatusChanged,
    applyRoomSnapshot,
    applyRoundStarted,
    applyTraceResolution,
    applyVoltageTestStarted,
    logMessage,
  ]);

  const ensureConnected = async (): Promise<GameConnectionManager> => {
    if (!sharedConnection) {
      sharedConnection = createGameConnection();
    }
    const conn = sharedConnection;
    if (!conn.isConnected) {
      await conn.start();
      setConnectionStatus('Connected');
    }
    return conn;
  };

  const createRoom = async (nickname: string, code?: string) => {
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubMethod(
        'CreateRoom',
        RoomJoinResultSchema,
        { hostNickname: nickname, roomCode: code || null }
      );
      if (res.isSuccess && res.data) {
        conn.saveSession({ roomId: res.data.roomCode, sessionToken: res.data.sessionToken });
        applyRoomSnapshot(res.data.gameState);
        logMessage(`Created room ${res.data.roomCode} as ${nickname}`);
      } else {
        fail('CreateRoom', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('CreateRoom', errText(err));
    }
  };

  const joinRoom = async (targetRoomCode: string, nickname: string) => {
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubMethod(
        'JoinRoom',
        RoomJoinResultSchema,
        { roomCode: targetRoomCode, nickname }
      );
      if (res.isSuccess && res.data) {
        conn.saveSession({ roomId: res.data.roomCode, sessionToken: res.data.sessionToken });
        applyRoomSnapshot(res.data.gameState);
        logMessage(`Joined room ${res.data.roomCode} as ${nickname}`);
      } else {
        fail('JoinRoom', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('JoinRoom', errText(err));
    }
  };

  const setReady = async (isReady: boolean) => {
    if (!roomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubCommand('SetReady', { roomCode, isReady });
      if (res.isSuccess) {
        logMessage(`SetReady sent: isReady=${isReady ? 'true' : 'false'}`);
      } else {
        fail('SetReady', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('SetReady', errText(err));
    }
  };

  const startRound = async () => {
    if (!roomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubCommand('StartRound', { roomCode });
      if (res.isSuccess) {
        logMessage('StartRound sent');
      } else {
        fail('StartRound', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('StartRound', errText(err));
    }
  };

  const playCards = async () => {
    const state = useGameStore.getState();
    const activeRoomCode = state.roomCode;
    const cards = state.selectedCardIds;
    const targetProtocol = state.currentTargetProtocol ?? 'Alpha';

    if (!activeRoomCode || cards.length === 0) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubCommand('PlayCards', {
        roomCode: activeRoomCode,
        cardIds: cards,
        declaredProtocol: targetProtocol,
      });
      if (res.isSuccess) {
        useGameStore.getState().clearSelection();
        logMessage(`PlayCards success: played ${cards.length} card(s) face-down as '${targetProtocol}'`);
      } else {
        fail('PlayCards', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('PlayCards', errText(err));
    }
  };

  const callTrace = async () => {
    const activeRoomCode = useGameStore.getState().roomCode;
    if (!activeRoomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubMethod('CallTrace', TraceResolutionSchema, { roomCode: activeRoomCode });
      if (res.isSuccess && res.data) {
        applyTraceResolution(res.data);
        logMessage(`CallTrace sent: BluffDetected=${res.data.bluffDetected ? 'true' : 'false'}`);
      } else {
        fail('CallTrace', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('CallTrace', errText(err));
    }
  };

  const simulateDisconnect = async () => {
    if (!sharedConnection) return;
    await sharedConnection.stop();
    setConnectionStatus('Disconnected');
    logMessage('Simulated socket disconnection');
  };

  const reconnect = async () => {
    if (!sharedConnection) return;
    if (!sharedConnection.getSession()) {
      logMessage('No active session saved in sessionStorage to reconnect');
      return;
    }
    try {
      await sharedConnection.start();
      setConnectionStatus('Connected');
    } catch (err) {
      fail('Reconnect', errText(err));
      return;
    }
    const resumed = await resumeSavedSession(sharedConnection, { resetOnFailure: false });
    if (resumed) logMessage('Reconnected successfully');
  };

  const activateExploit = async (exploit: string, newTargetProtocol?: string) => {
    const activeRoomCode = useGameStore.getState().roomCode;
    if (!activeRoomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubCommand('ActivateExploit', {
        roomCode: activeRoomCode,
        exploit,
        newTargetProtocol: newTargetProtocol ?? null,
      });
      if (res.isSuccess) {
        logMessage(`ActivateExploit success: ${exploit}`);
      } else {
        fail('ActivateExploit', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('ActivateExploit', errText(err));
    }
  };

  const triggerDischarge = async () => {
    const activeRoomCode = useGameStore.getState().roomCode;
    if (!activeRoomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubCommand('TriggerDischarge', {
        roomCode: activeRoomCode,
      });
      if (res.isSuccess) {
        logMessage('TriggerDischarge success: capacitor discharged');
      } else {
        fail('TriggerDischarge', res.error ?? res.errorCode ?? 'Unknown error');
      }
    } catch (err) {
      fail('TriggerDischarge', errText(err));
    }
  };

  return {
    connectionStatus,
    lastLog,
    selectedProtocol,
    setSelectedProtocol,
    createRoom,
    joinRoom,
    setReady,
    startRound,
    playCards,
    callTrace,
    activateExploit,
    triggerDischarge,
    simulateDisconnect,
    reconnect,
    leaveRoom,
    isInRoom,
  };
}

export const useDebugTerminal = useGameSession;
