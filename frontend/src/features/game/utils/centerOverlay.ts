import type { RoomState } from '../schemas/gameEvents';

export type CenterOverlayKind = 'lobby' | 'summary' | 'intermission' | null;

export interface ResolveCenterOverlayInput {
  roomState: RoomState | null;
  isRevealing: boolean;
  isDischarging: boolean;
}

/**
 * Pure resolver for the central 2D overlay inside the 3D Bunker Arena.
 * During card reveal or discharge cinematic, returns null so the 3D table is unobstructed.
 */
export function resolveCenterOverlay(input: ResolveCenterOverlayInput): CenterOverlayKind {
  if (input.roomState === 'Lobby') {
    return 'lobby';
  }
  if (input.isRevealing || input.isDischarging) {
    return null;
  }
  if (input.roomState === 'GameOver') {
    return 'summary';
  }
  if (input.roomState === 'RoundOver') {
    return 'intermission';
  }
  return null;
}
