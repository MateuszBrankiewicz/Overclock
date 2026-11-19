import type {
  CapacitorDischargedEvent,
  ExploitTriggeredEvent,
  PacketSniffedEvent,
  PlayerEliminatedEvent,
  PlayerJoinedEvent,
  PlayerSeat,
  PlayerStatusChangedEvent,
  VoltageTestStartedEvent,
} from '../../schemas/gameEvents';
import type { GameState } from '../types';

/**
 * Pure state transitions for room events: take the relevant state subset plus the event and
 * return the patch to merge. No React, no store access, no side effects (audio/haptics live
 * in the slices).
 */

type PlayersState = Pick<GameState, 'players'>;

export function dischargeUpdate(
  state: PlayersState,
  event: CapacitorDischargedEvent,
  nowMs: number = Date.now()
): Partial<GameState> {
  return {
    lastDischargeOutcome: event,
    dischargeCinematic: {
      event,
      startedAtMs: nowMs,
    },
    queuedDischarge: null,
    awaitingDischargeForSequence: null,
    pendingDischargePlayerId: null,
    dischargeDeadlineUtc: null,
    players: state.players.map((seat) =>
      seat.playerId === event.playerId
        ? {
            ...seat,
            riskLevel: event.resultingRiskLevel,
            status: event.overloaded ? 'Eliminated' : seat.status,
          }
        : seat
    ),
  };
}

export function applyPlayerJoinedReducer(
  state: PlayersState,
  event: PlayerJoinedEvent
): Partial<GameState> {
  const incoming: PlayerSeat = 'player' in event ? event.player : event;
  const existingIndex = state.players.findIndex((seat) => seat.playerId === incoming.playerId);

  if (existingIndex >= 0) {
    const nextPlayers = [...state.players];
    nextPlayers[existingIndex] = incoming;
    return { players: nextPlayers };
  }

  return { players: [...state.players, incoming] };
}

export function applyPlayerStatusChangedReducer(
  state: PlayersState,
  event: PlayerStatusChangedEvent
): Partial<GameState> {
  return {
    players: state.players.map((seat) =>
      seat.playerId === event.playerId ? { ...seat, status: event.status } : seat
    ),
  };
}

/** Returns an empty patch when the discharge was already shown or queued (duplicate delivery). */
export function applyCapacitorDischargedReducer(
  state: Pick<GameState, 'players' | 'dischargeCinematic' | 'queuedDischarge' | 'traceReveal'>,
  event: CapacitorDischargedEvent,
  nowMs: number = Date.now()
): Partial<GameState> {
  if (
    event.sequenceNumber !== undefined &&
    (state.dischargeCinematic?.event.sequenceNumber === event.sequenceNumber ||
      state.queuedDischarge?.sequenceNumber === event.sequenceNumber)
  ) {
    return {};
  }
  // Let the card reveal finish first; finishTraceReveal starts the discharge afterwards.
  if (state.traceReveal) {
    return { queuedDischarge: event, pendingDischargePlayerId: null, dischargeDeadlineUtc: null };
  }
  return dischargeUpdate(state, event, nowMs);
}

/** Ends the trace reveal and starts any discharge queued behind it. */
export function finishTraceRevealReducer(
  state: Pick<GameState, 'players' | 'traceReveal' | 'queuedDischarge'>,
  nowMs: number = Date.now()
): Partial<GameState> {
  if (!state.traceReveal) return {};
  const queued = state.queuedDischarge;
  return {
    traceReveal: null,
    ...(queued ? dischargeUpdate(state, queued, nowMs) : {}),
  };
}

export function applyPlayerEliminatedReducer(
  state: Pick<GameState, 'players' | 'placementByPlayerId'>,
  event: PlayerEliminatedEvent
): Partial<GameState> {
  return {
    placementByPlayerId: {
      ...state.placementByPlayerId,
      [event.playerId]: event.placement,
    },
    players: state.players.map((seat) =>
      seat.playerId === event.playerId ? { ...seat, status: 'Eliminated' } : seat
    ),
  };
}

export function applyExploitTriggeredReducer(
  state: Pick<
    GameState,
    'players' | 'currentTargetProtocol' | 'turnDeadlineUtc' | 'tablePileCount' | 'sniffedCard'
  >,
  event: ExploitTriggeredEvent
): Partial<GameState> {
  return {
    currentTargetProtocol: event.newTargetProtocol ?? state.currentTargetProtocol,
    turnDeadlineUtc: event.turnDeadlineUtc ?? state.turnDeadlineUtc,
    tablePileCount: event.exploit === 'EmpFlare' ? 0 : state.tablePileCount,
    sniffedCard: event.exploit === 'EmpFlare' ? null : state.sniffedCard,
    players: state.players.map((seat) =>
      seat.playerId === event.playerId
        ? {
            ...seat,
            riskLevel: event.newRiskLevel ?? seat.riskLevel,
            exploit: seat.exploit ? { ...seat.exploit, isBurned: true } : seat.exploit,
          }
        : seat
    ),
  };
}

export function applyPacketSniffedReducer(event: PacketSniffedEvent): Partial<GameState> {
  return { sniffedCard: event.card };
}

export function applyVoltageTestStartedReducer(
  event: VoltageTestStartedEvent
): Partial<GameState> {
  return {
    roomState: 'VoltageTest',
    pendingDischargePlayerId: event.pendingPlayerId,
    dischargeDeadlineUtc: event.decisionDeadlineUtc ?? null,
    lastDischargeOutcome: null,
  };
}
