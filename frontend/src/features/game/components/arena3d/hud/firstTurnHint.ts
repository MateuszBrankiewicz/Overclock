import { useState } from 'react';

import type { RoomState } from '../../../schemas/gameEvents';

export interface FirstTurnHintState {
  /** The hint has already been offered during the current match. */
  consumed: boolean;
  visible: boolean;
}

export const INITIAL_FIRST_TURN_HINT: FirstTurnHintState = { consumed: false, visible: false };

/**
 * Shows the hint the first time the local player's turn starts in a match.
 * A new match (lobby / game over) re-arms it.
 */
export function nextFirstTurnHint(
  state: FirstTurnHintState,
  input: { isMyTurn: boolean; roomState: RoomState | null }
): FirstTurnHintState {
  if (input.roomState === 'Lobby' || input.roomState === 'GameOver') {
    return state.consumed || state.visible ? INITIAL_FIRST_TURN_HINT : state;
  }
  if (!input.isMyTurn) {
    return state.visible ? { ...state, visible: false } : state;
  }
  if (!state.consumed) return { consumed: true, visible: true };
  return state;
}

export function useFirstTurnHint(
  isMyTurn: boolean,
  roomState: RoomState | null
): { visible: boolean; dismiss: () => void } {
  const [state, setState] = useState(INITIAL_FIRST_TURN_HINT);
  const next = nextFirstTurnHint(state, { isMyTurn, roomState });
  if (next !== state) setState(next);
  return {
    visible: next.visible,
    dismiss: () => setState((s) => ({ ...s, visible: false })),
  };
}
