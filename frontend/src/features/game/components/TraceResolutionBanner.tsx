import { useGameStore } from '../stores/useGameStore';

export function TraceResolutionBanner() {
  const roomState = useGameStore((state) => state.roomState);
  const roundNumber = useGameStore((state) => state.roundNumber);
  const lastTraceResolution = useGameStore((state) => state.lastTraceResolution);

  if (!lastTraceResolution && roomState !== 'RoundOver') {
    return null;
  }

  return (
    <div className="space-y-2 pt-1">
      {roomState === 'RoundOver' && (
        <div className="p-2 bg-amber-950/50 border border-amber-600/80 rounded text-[11px] text-amber-200 flex justify-between items-center">
          <span>ROUND {roundNumber} COMPLETE</span>
          <span className="text-zinc-400 text-[10px]">Host can click [Start Round] for next round</span>
        </div>
      )}

      {lastTraceResolution && (
        <div
          className={`p-2.5 rounded border text-[11px] space-y-1.5 ${
            lastTraceResolution.bluffDetected
              ? 'bg-red-950/40 border-red-800 text-red-200'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
          }`}
        >
          <div className="font-bold flex justify-between items-center border-b border-zinc-800/80 pb-1">
            <span>LAST TRACE CHALLENGE</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                lastTraceResolution.bluffDetected
                  ? 'bg-red-600 text-black'
                  : 'bg-emerald-500 text-black'
              }`}
            >
              {lastTraceResolution.bluffDetected ? 'BLUFF DETECTED' : 'HONEST PLAY (TRUTH)'}
            </span>
          </div>

          <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-4">
            <span>ACCUSER: {lastTraceResolution.accuserPlayerId.slice(0, 8)}</span>
            <span>ACCUSED: {lastTraceResolution.accusedPlayerId.slice(0, 8)}</span>
            <span className="text-amber-400 font-bold">
              LOSER: {lastTraceResolution.loserPlayerId.slice(0, 8)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-zinc-400">REVEALED CARDS:</span>
            {lastTraceResolution.revealedCards.map((c) => (
              <span
                key={c.id}
                className="px-1.5 py-0.5 bg-black border border-zinc-700 rounded text-[10px] text-emerald-400 font-mono"
              >
                {c.protocol} [{c.id.slice(0, 4)}]
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

