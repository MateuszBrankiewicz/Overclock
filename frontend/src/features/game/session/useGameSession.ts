import { useEffect } from 'react';

import { setGameAudioHum } from '../../../shared/lib/audio';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { retainGameHandlers } from './registerGameHandlers';
import * as commands from './sessionCommands';
import { getSharedConnection } from './sharedConnection';
import { startSession } from './startSession';

/**
 * Binds a component to the realtime game session: keeps the shared connection started,
 * the server event handlers registered (once, however many components mount this),
 * and the in-game audio hum in sync with the room state. Returns the hub commands.
 */
export function useGameSession() {
  const connectionStatus = useUiStore((state) => state.connectionStatus);
  const isInRoom = useGameStore((state) => state.isInRoom);
  const roomState = useGameStore((state) => state.roomState);

  useEffect(() => {
    const isGameActive = roomState !== null && roomState !== 'Lobby' && roomState !== 'GameOver';
    setGameAudioHum(isGameActive);
    return () => {
      setGameAudioHum(false);
    };
  }, [roomState]);

  useEffect(() => {
    const conn = getSharedConnection();
    const release = retainGameHandlers(conn);
    startSession(conn);
    return release;
  }, []);

  return {
    connectionStatus,
    isInRoom,
    createRoom: commands.createRoom,
    joinRoom: commands.joinRoom,
    selectCharacter: commands.selectCharacter,
    setReady: commands.setReady,
    startRound: commands.startRound,
    playCards: commands.playCards,
    callTrace: commands.callTrace,
    activateExploit: commands.activateExploit,
    triggerDischarge: commands.triggerDischarge,
    leaveRoom: commands.leaveRoom,
  };
}
