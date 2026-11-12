import { useEffect } from 'react';

import { useGameStore } from '../stores/useGameStore';
import { syncRoomParam } from '../utils/invite';

/**
 * Mirrors the joined room into `?room=CODE` and removes it on leave. The subscription fires
 * synchronously on store updates, so the URL is already clean when the lobby re-mounts.
 */
export function useRoomUrlSync(): void {
  useEffect(() => {
    const current = useGameStore.getState().roomCode;
    if (current) syncRoomParam(current);
    return useGameStore.subscribe((state, prev) => {
      if (state.roomCode !== prev.roomCode) syncRoomParam(state.roomCode);
    });
  }, []);
}
