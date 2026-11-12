import type { TraceResolution } from '../../schemas/gameEvents';
import type { GameState } from '../types';

/**
 * Shared helper to start the 3D card reveal sequence when a trace resolution arrives,
 * either via direct TraceCalled / callTrace invoke or from a RoomStateSnapshot.
 */
export function startTraceReveal(
  state: GameState,
  resolution: TraceResolution
): Partial<GameState> {
  const seq = resolution.sequenceNumber ?? null;
  return {
    lastTraceResolution: resolution,
    tablePileCount: 0,
    turnDeadlineUtc: null,
    traceReveal: {
      resolution,
      startedAtMs: Date.now(),
      seatsAtReveal: state.players,
    },
    lastRevealedTraceSequence: seq,
    awaitingDischargeForSequence: seq,
  };
}
