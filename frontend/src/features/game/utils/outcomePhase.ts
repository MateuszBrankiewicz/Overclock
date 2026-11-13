import type { RoomState } from '../schemas/gameEvents';

export type OutcomePhase =
  | 'reveal'
  | 'decision'
  | 'discharge'
  | 'summary'
  | 'intermission'
  | null;

export interface ResolveOutcomePhaseInput {
  roomState: RoomState | null;
  hasTraceReveal: boolean;
  hasQueuedDischarge: boolean;
  hasDischargeCinematic: boolean;
  awaitingDischarge: boolean; // trace resolved, discharge has not yet arrived
}

/**
 * Determines the authoritative outcome presentation phase following Call Trace.
 * Priority order:
 * 1. 'reveal'        — cards are flipping on the 3D table
 * 2. 'discharge'     — discharge cinematic playing
 * 3. 'decision'      — VoltageTest active (loser has Ground Wire choice)
 * 3b. 'discharge'    — discharge queued/awaited
 * 4. 'summary'       — GameOver match summary
 * 5. 'intermission'  — RoundOver countdown banner
 * 6. null            — active turn / dealing / lobby / normal gameplay
 */
export function resolveOutcomePhase(input: ResolveOutcomePhaseInput): OutcomePhase {
  if (input.hasTraceReveal) {
    return 'reveal';
  }

  // The roll is already on screen: the room snapshot leaving VoltageTest may still be in flight.
  if (input.hasDischargeCinematic) {
    return 'discharge';
  }

  if (input.roomState === 'VoltageTest') {
    return 'decision';
  }

  if (input.hasQueuedDischarge || input.awaitingDischarge) {
    return 'discharge';
  }

  if (input.roomState === 'GameOver') {
    return 'summary';
  }

  if (input.roomState === 'RoundOver') {
    return 'intermission';
  }

  return null;
}
