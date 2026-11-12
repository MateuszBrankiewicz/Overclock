import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { RoomState } from '../../schemas/gameEvents';

export type ArenaFrameloop = 'always' | 'demand' | 'never';

/** How long the lobby keeps rendering continuously after a camera interaction. */
export const LOBBY_WAKE_MS = 1500;

export function resolveFrameloop(
  documentHidden: boolean,
  roomState: RoomState | null,
  awake: boolean
): ArenaFrameloop {
  if (documentHidden) return 'never';
  if (roomState === 'Lobby' && !awake) return 'demand';
  return 'always';
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

const isDocumentHidden = () => typeof document !== 'undefined' && document.hidden;

/**
 * Frame scheduling for the 3D arena: paused while the tab is hidden, on-demand in the lobby
 * (nothing animates there except camera moves, which call `wake`), continuous otherwise.
 */
export function useArenaFrameloop(roomState: RoomState | null): {
  frameloop: ArenaFrameloop;
  wake: () => void;
} {
  const hidden = useSyncExternalStore(subscribeVisibility, isDocumentHidden, () => false);
  const [awake, setAwake] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = useCallback(() => {
    setAwake(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAwake(false), LOBBY_WAKE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { frameloop: resolveFrameloop(hidden, roomState, awake), wake };
}
