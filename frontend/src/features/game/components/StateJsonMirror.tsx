import { useGameStore } from '../stores/useGameStore';
import { formatDisplayRoomCode, useUiStore } from '../stores/useUiStore';

export function StateJsonMirror() {
  const gameState = useGameStore((state) => state);
  const maskRoomCode = useUiStore((state) => state.maskRoomCode);
  const holdToRevealCards = useUiStore((state) => state.holdToRevealCards);
  const isHandRevealed = useUiStore((state) => state.isHandRevealed);
  const isConcealed = holdToRevealCards && !isHandRevealed;

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
            roomCode: gameState.roomCode ? formatDisplayRoomCode(gameState.roomCode, maskRoomCode) : null,
            roomState: gameState.roomState,
            hostId: gameState.hostId,
            playerId: gameState.playerId,
            activePlayerId: gameState.activePlayerId,
            currentTargetProtocol: gameState.currentTargetProtocol,
            tablePileCount: gameState.tablePileCount,
            roundNumber: gameState.roundNumber,
            seats: gameState.players,
            myCards: isConcealed ? { concealed: true, count: gameState.myCards.length } : gameState.myCards,
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
