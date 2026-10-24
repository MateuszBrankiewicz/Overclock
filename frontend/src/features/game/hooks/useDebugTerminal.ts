import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createGameConnection,
  GameConnectionManager,
} from '../../../shared/realtime/gameConnection';
import {
  type CardProtocol,
  CardsPlayedEventSchema,
  PlayerGameStateSchema,
  PlayerJoinedEventSchema,
  PlayerStatusChangedEventSchema,
  RoomJoinResultSchema,
  RoomStateSnapshotSchema,
  RoundStartedEventSchema,
  TraceResolutionSchema,
} from '../schemas/gameEvents';
import { useGameStore } from '../stores/useGameStore';

export function useDebugTerminal() {
  const connectionRef = useRef<GameConnectionManager | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastLog, setLastLog] = useState<string>('Terminal initialized');

  const roomCode = useGameStore((state) => state.roomCode);
  const isInRoom = useGameStore((state) => state.isInRoom);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const currentTargetProtocol = useGameStore((state) => state.currentTargetProtocol);
  const applyRoomSnapshot = useGameStore((state) => state.applyRoomSnapshot);
  const applyPlayerJoined = useGameStore((state) => state.applyPlayerJoined);
  const applyPlayerStatusChanged = useGameStore((state) => state.applyPlayerStatusChanged);
  const applyCardsPlayed = useGameStore((state) => state.applyCardsPlayed);
  const applyTraceResolution = useGameStore((state) => state.applyTraceResolution);
  const applyRoundStarted = useGameStore((state) => state.applyRoundStarted);
  const leaveRoom = useGameStore((state) => state.leaveRoom);

  const [customProtocol, setCustomProtocol] = useState<CardProtocol | null>(null);
  const selectedProtocol = customProtocol ?? currentTargetProtocol ?? 'Alpha';

  const setSelectedProtocol = useCallback((protocol: CardProtocol) => {
    setCustomProtocol(protocol);
  }, []);

  const logMessage = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLastLog(`[${timestamp}] ${msg}`);
  }, []);

  useEffect(() => {
    const conn = createGameConnection({
      onReconnecting: () => setConnectionStatus('Reconnecting'),
      onReconnected: () => setConnectionStatus('Connected'),
      onClosed: () => setConnectionStatus('Disconnected'),
      onContractViolation: (eventName, error) => {
        logMessage(`Contract Violation in ${eventName}: ${error.message}`);
      },
    });

    connectionRef.current = conn;

    const unsubs = [
      conn.on('ReceiveGameState', RoomStateSnapshotSchema, (snapshot) => {
        applyRoomSnapshot(snapshot);
        logMessage(`ReceiveGameState received: State=${snapshot.state}`);
      }),
      conn.on('PlayerJoined', PlayerJoinedEventSchema, (event) => {
        applyPlayerJoined(event);
        logMessage('PlayerJoined event received');
      }),
      conn.on('PlayerStatusChanged', PlayerStatusChangedEventSchema, (event) => {
        applyPlayerStatusChanged(event);
        logMessage(`PlayerStatusChanged: ${event.playerId} -> ${event.status}`);
      }),
      conn.on('CardsPlayed', CardsPlayedEventSchema, (event) => {
        applyCardsPlayed(event);
        logMessage(`CardsPlayed: count=${event.cardCount}, protocol=${event.declaredProtocol}`);
      }),
      conn.on('TraceCalled', TraceResolutionSchema, (resolution) => {
        applyTraceResolution(resolution);
        logMessage(`TraceCalled: bluffDetected=${resolution.bluffDetected ? 'true' : 'false'}`);
      }),
      conn.on('RoundStarted', RoundStartedEventSchema, (event) => {
        applyRoundStarted(event);
        logMessage(`RoundStarted: round ${event.roundNumber}, lead=${event.leadProtocol ?? 'none'}`);
      }),
    ];

    void conn
      .start()
      .then(() => {
        setConnectionStatus('Connected');
        logMessage('Connected to SignalR GameHub');
      })
      .catch((err: unknown) => {
        setConnectionStatus('Error');
        logMessage(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
      });

    return () => {
      unsubs.forEach((u) => u());
      void conn.stop();
    };
  }, [
    applyCardsPlayed,
    applyPlayerJoined,
    applyPlayerStatusChanged,
    applyRoomSnapshot,
    applyRoundStarted,
    applyTraceResolution,
    logMessage,
  ]);

  const ensureConnected = async (): Promise<GameConnectionManager> => {
    const conn = connectionRef.current;
    if (!conn) {
      throw new Error('Connection manager not initialized');
    }
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
        logMessage(`CreateRoom failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`CreateRoom error: ${err instanceof Error ? err.message : String(err)}`);
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
        logMessage(`JoinRoom failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`JoinRoom error: ${err instanceof Error ? err.message : String(err)}`);
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
        logMessage(`SetReady failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`SetReady error: ${err instanceof Error ? err.message : String(err)}`);
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
        logMessage(`StartRound failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`StartRound error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const playCards = async () => {
    if (!roomCode || selectedCardIds.length === 0) return;
    try {
      const conn = await ensureConnected();
      const declared = selectedProtocol || currentTargetProtocol || 'Alpha';
      const res = await conn.invokeHubCommand('PlayCards', {
        roomCode,
        cardIds: selectedCardIds,
        declaredProtocol: declared,
      });
      if (res.isSuccess) {
        useGameStore.getState().clearSelection();
        logMessage(`PlayCards success: played ${selectedCardIds.length} card(s) face-down as '${declared}'`);
      } else {
        logMessage(`PlayCards failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`PlayCards error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const callTrace = async () => {
    if (!roomCode) return;
    try {
      const conn = await ensureConnected();
      const res = await conn.invokeHubMethod('CallTrace', TraceResolutionSchema, { roomCode });
      if (res.isSuccess && res.data) {
        applyTraceResolution(res.data);
        logMessage(`CallTrace sent: BluffDetected=${res.data.bluffDetected ? 'true' : 'false'}`);
      } else {
        logMessage(`CallTrace failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`CallTrace error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const simulateDisconnect = async () => {
    if (!connectionRef.current) return;
    await connectionRef.current.stop();
    setConnectionStatus('Disconnected');
    logMessage('Simulated socket disconnection');
  };

  const reconnect = async () => {
    const conn = connectionRef.current;
    if (!conn) return;
    const session = conn.getSession();
    if (!session) {
      logMessage('No active session saved in sessionStorage to reconnect');
      return;
    }
    try {
      await conn.start();
      setConnectionStatus('Connected');
      const res = await conn.invokeHubMethod('Reconnect', PlayerGameStateSchema, {
        roomCode: session.roomId,
        sessionToken: session.sessionToken,
      });
      if (res.isSuccess && res.data) {
        applyRoomSnapshot(res.data);
        logMessage(`Reconnected successfully to room ${res.data.roomCode}`);
      } else {
        logMessage(`Reconnect failed: ${res.error ?? res.errorCode ?? 'Unknown error'}`);
      }
    } catch (err) {
      logMessage(`Reconnect error: ${err instanceof Error ? err.message : String(err)}`);
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
    simulateDisconnect,
    reconnect,
    leaveRoom,
    isInRoom,
  };
}
