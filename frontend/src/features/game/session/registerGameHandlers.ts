import { playSfx } from '../../../shared/lib/audio';
import type { GameConnectionManager } from '../../../shared/realtime/gameConnection';
import {
  CapacitorDischargedEventSchema,
  CardsPlayedEventSchema,
  ExploitTriggeredEventSchema,
  PacketSniffedEventSchema,
  PlayerEliminatedEventSchema,
  PlayerJoinedEventSchema,
  PlayerStatusChangedEventSchema,
  RoomStateSnapshotSchema,
  RoundStartedEventSchema,
  TraceResolutionSchema,
  VoltageTestStartedEventSchema,
} from '../schemas/gameEvents';
import { type QueuedActionType, useActionQueue } from '../stores/useActionQueue';
import { useGameStore } from '../stores/useGameStore';
import { logSession } from '../stores/useSessionLog';
import { recordGameEvent } from './recordGameEvent';

/** Broadcast snapshots are only accepted for the room this client is currently seated in. */
export function isSnapshotForCurrentRoom(currentRoomCode: string | null, snapshotRoomCode: string): boolean {
  return currentRoomCode !== null && currentRoomCode === snapshotRoomCode;
}

type HandlerConnection = Pick<GameConnectionManager, 'on'>;

function enqueue(name: QueuedActionType, payload: unknown, sequenceNumber: number | undefined, minDurationMs: number): void {
  useActionQueue.getState().enqueueAction(name, payload, { sequenceNumber, minDurationMs });
}

/**
 * Subscribes every server → client game event: Zod-validated by the connection, then applied
 * to the stores, queued for the cinematic pacing and recorded in the feed. Returns an unsubscribe.
 */
export function registerGameHandlers(conn: HandlerConnection): () => void {
  const game = () => useGameStore.getState();
  const unsubs = [
    conn.on('ReceiveGameState', RoomStateSnapshotSchema, (snapshot) => {
      // Joining always goes through CreateRoom/JoinRoom/Reconnect, which apply their own
      // snapshot. A broadcast for any other room (e.g. one we just left) must not pull us back.
      if (!isSnapshotForCurrentRoom(game().roomCode, snapshot.roomCode)) {
        logSession(`Ignored ReceiveGameState for room ${snapshot.roomCode}`);
        return;
      }
      enqueue('ReceiveGameState', snapshot, snapshot.sequenceNumber, 100);
      game().applyRoomSnapshot(snapshot);
      logSession(`ReceiveGameState received: State=${snapshot.state}`);
    }),
    conn.on('PlayerJoined', PlayerJoinedEventSchema, (event) => {
      enqueue('PlayerJoined', event, undefined, 100);
      game().applyPlayerJoined(event);
      logSession('PlayerJoined event received');
    }),
    conn.on('PlayerStatusChanged', PlayerStatusChangedEventSchema, (event) => {
      enqueue('PlayerStatusChanged', event, event.sequenceNumber, 150);
      game().applyPlayerStatusChanged(event);
      logSession(`PlayerStatusChanged: ${event.playerId} -> ${event.status}`);
    }),
    conn.on('CardsPlayed', CardsPlayedEventSchema, (event) => {
      enqueue('CardsPlayed', event, event.sequenceNumber, 350);
      game().applyCardsPlayed(event);
      recordGameEvent({ kind: 'CardsPlayed', event });
      logSession(`CardsPlayed: count=${event.cardCount}, protocol=${event.declaredProtocol}`);
    }),
    conn.on('TraceCalled', TraceResolutionSchema, (resolution) => {
      enqueue('TraceCalled', resolution, resolution.sequenceNumber, 600);
      game().applyTraceResolution(resolution);
      recordGameEvent({ kind: 'TraceCalled', event: resolution });
      logSession(`TraceCalled: bluffDetected=${resolution.bluffDetected ? 'true' : 'false'}`);
    }),
    conn.on('RoundStarted', RoundStartedEventSchema, (event) => {
      enqueue('RoundStarted', event, event.sequenceNumber, 250);
      game().applyRoundStarted(event);
      recordGameEvent({ kind: 'RoundStarted', event });
      logSession(`RoundStarted: round ${event.roundNumber}, lead=${event.leadProtocol ?? 'none'}`);
    }),
    conn.on('CapacitorDischarged', CapacitorDischargedEventSchema, (event) => {
      enqueue('CapacitorDischarged', event, event.sequenceNumber, 400);
      game().applyCapacitorDischarged(event);
      recordGameEvent({ kind: 'CapacitorDischarged', event });
      logSession(
        `CapacitorDischarged: player=${event.playerId}, roll=${event.roll}, risk=${event.riskLevel}->${event.resultingRiskLevel}, overloaded=${event.overloaded}`
      );
    }),
    conn.on('PlayerEliminated', PlayerEliminatedEventSchema, (event) => {
      enqueue('PlayerEliminated', event, event.sequenceNumber, 500);
      game().applyPlayerEliminated(event);
      recordGameEvent({ kind: 'PlayerEliminated', event });
      logSession(`PlayerEliminated: player=${event.playerId}, placement=#${event.placement}`);
    }),
    conn.on('ExploitTriggered', ExploitTriggeredEventSchema, (event) => {
      enqueue('ExploitTriggered', event, event.sequenceNumber, 350);
      game().applyExploitTriggered(event);
      recordGameEvent({ kind: 'ExploitTriggered', event });
      logSession(`ExploitTriggered: player=${event.playerId}, exploit=${event.exploit}`);
    }),
    conn.on('PacketSniffed', PacketSniffedEventSchema, (event) => {
      enqueue('PacketSniffed', event, event.sequenceNumber, 300);
      game().applyPacketSniffed(event);
      logSession(`PacketSniffed: peeked card protocol=${event.card.protocol}`);
    }),
    conn.on('VoltageTestStarted', VoltageTestStartedEventSchema, (event) => {
      enqueue('VoltageTestStarted', event, event.sequenceNumber, 300);
      game().applyVoltageTestStarted(event);
      const riskLevel =
        game().players.find((p) => p.playerId === event.pendingPlayerId)?.riskLevel ?? 1;
      playSfx('voltageBuzz', { riskLevel });
      logSession(`VoltageTestStarted: pending=${event.pendingPlayerId}`);
    }),
  ];
  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

let retainCount = 0;
let releaseHandlers: (() => void) | null = null;

/**
 * Reference-counted registration: any number of mounted session hooks share ONE set of
 * handlers, so every server event is applied exactly once. Returns the release callback.
 */
export function retainGameHandlers(conn: HandlerConnection): () => void {
  if (retainCount === 0) releaseHandlers = registerGameHandlers(conn);
  retainCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    retainCount -= 1;
    if (retainCount === 0) {
      releaseHandlers?.();
      releaseHandlers = null;
    }
  };
}

/** Test helper: drops any handler registration left over from a previous test. */
export function resetGameHandlersForTests(): void {
  releaseHandlers?.();
  releaseHandlers = null;
  retainCount = 0;
}
