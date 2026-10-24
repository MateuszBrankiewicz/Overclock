import { useGameStore } from '../stores/useGameStore';

export function StateJsonMirror() {
  const gameState = useGameStore((state) => state);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-zinc-500 text-[11px]">
        <span>AUTHORITATIVE ROOM STATE (JSON MIRROR)</span>
        <span>PILE COUNT: {gameState.tablePileCount}</span>
      </div>
      <pre
        data-testid="state-json-mirror"
        className="bg-black/80 border border-zinc-800 p-3 rounded text-[11px] text-emerald-300 overflow-auto max-h-56 leading-snug"
      >
        {JSON.stringify(
          {
            roomCode: gameState.roomCode,
            roomState: gameState.roomState,
            hostId: gameState.hostId,
            playerId: gameState.playerId,
            activePlayerId: gameState.activePlayerId,
            currentTargetProtocol: gameState.currentTargetProtocol,
            tablePileCount: gameState.tablePileCount,
            roundNumber: gameState.roundNumber,
            seats: gameState.players,
            myCards: gameState.myCards,
            selectedCardIds: gameState.selectedCardIds,
            lastTraceResolution: gameState.lastTraceResolution,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}

