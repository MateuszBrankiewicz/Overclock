import { useCallback, useState } from 'react';

import type { CardProtocol } from '../schemas/gameEvents';
import { reconnect, simulateDisconnect } from '../session/sessionCommands';
import { useGameSession } from '../session/useGameSession';
import { useGameStore } from '../stores/useGameStore';
import { useSessionLog } from '../stores/useSessionLog';

/** The game session plus the debug-only controls of the developer terminal. */
export function useDebugTerminal() {
  const session = useGameSession();
  const lastLog = useSessionLog((state) => state.lastLog);
  const currentTargetProtocol = useGameStore((state) => state.currentTargetProtocol);
  const [customProtocol, setCustomProtocol] = useState<CardProtocol | null>(null);
  const selectedProtocol = customProtocol ?? currentTargetProtocol ?? 'Alpha';
  const setSelectedProtocol = useCallback((protocol: CardProtocol) => setCustomProtocol(protocol), []);

  return {
    ...session,
    lastLog,
    selectedProtocol,
    setSelectedProtocol,
    simulateDisconnect,
    reconnect,
  };
}
