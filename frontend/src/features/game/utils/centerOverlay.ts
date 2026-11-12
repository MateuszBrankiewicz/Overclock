import type { RoomState } from '../schemas/gameEvents';
import type { OutcomePhase } from './outcomePhase';

export type CenterOverlayKind = 'lobby' | 'summary' | 'intermission' | null;

export interface ResolveCenterOverlayInput {
  roomState: RoomState | null;
  phase: OutcomePhase;
}

/**
 * Pure resolver for the central 2D overlay inside the 3D Bunker Arena.
 * Maps outcome presentation phases to UI overlays:
 * - 'lobby' -> LobbyPlayerList
 * - 'summary' -> MatchSummary
 * - 'intermission' -> RoundIntermissionBanner
 * - null -> no 2D overlay on the table
 */
export function resolveCenterOverlay(input: ResolveCenterOverlayInput): CenterOverlayKind {
  if (input.roomState === 'Lobby') {
    return 'lobby';
  }
  if (input.phase === 'summary') {
    return 'summary';
  }
  if (input.phase === 'intermission') {
    return 'intermission';
  }
  return null;
}
