import { useEffect } from 'react';

import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { syncRoomParam } from '../utils/invite';

/**
 * Mirrors the joined room into `?room=CODE` and removes it on leave (or when Streamer Mode
 * masks the room code). Never clears an incoming invite URL before the player joins a room.
 */
export function useRoomUrlSync(): void {
  useEffect(() => {
    const syncCurrentRoom = () => {
      const roomCode = useGameStore.getState().roomCode;
      if (!roomCode) return;
      const maskRoomCode = useUiStore.getState().maskRoomCode;
      syncRoomParam(maskRoomCode ? null : roomCode);
    };

    syncCurrentRoom();

    const unsubGame = useGameStore.subscribe((state, prev) => {
      if (state.roomCode !== prev.roomCode) {
        const maskRoomCode = useUiStore.getState().maskRoomCode;
        syncRoomParam(state.roomCode && !maskRoomCode ? state.roomCode : null);
      }
    });
    const unsubUi = useUiStore.subscribe((state, prev) => {
      if (state.maskRoomCode !== prev.maskRoomCode) {
        syncCurrentRoom();
      }
    });

    return () => {
      unsubGame();
      unsubUi();
    };
  }, []);
}
