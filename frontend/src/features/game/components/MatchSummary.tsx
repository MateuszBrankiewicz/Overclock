import clsx from 'clsx';
import { LogOut, Trophy } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { PlayerSeat } from '../schemas/gameEvents';
import { buildPodium } from '../utils/podium';

export interface MatchSummaryProps {
  players: PlayerSeat[];
  placementByPlayerId: Record<string, number>;
  winnerId: string | null;
  myPlayerId: string | null;
  roundNumber: number;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export const MatchSummary: React.FC<MatchSummaryProps> = ({
  players,
  placementByPlayerId,
  winnerId,
  myPlayerId,
  roundNumber,
  isHost,
  onPlayAgain,
  onLeave,
}) => {
  const { t } = useI18n();
  const podium = buildPodium(players, placementByPlayerId, winnerId);
  const winner = podium.find((entry) => entry.isWinner);

  return (
    <div
      data-testid="match-summary"
      className="w-full max-w-md mx-auto p-5 bg-black/90 border-2 border-emerald-500 rounded-xl text-center space-y-4 font-mono shadow-[0_0_50px_rgba(16,185,129,0.5)]"
    >
      <h2 className="text-xs font-black tracking-widest text-zinc-400">{t.summary.title}</h2>

      {winner && (
        <div className="space-y-1">
          <Trophy className="w-8 h-8 mx-auto text-amber-400" />
          <p className="text-[11px] uppercase text-zinc-400">{t.summary.winnerLabel}</p>
          <p className="text-2xl font-black text-emerald-300 tracking-wider break-words">
            {winner.nickname}
            {winner.playerId === myPlayerId && ` ${t.summary.youTag}`}
          </p>
        </div>
      )}

      <div className="text-left space-y-1.5">
        <p className="text-[11px] font-bold text-zinc-400 uppercase">{t.summary.podiumTitle}</p>
        <ol className="space-y-1">
          {podium.map((entry) => (
            <li
              key={entry.playerId}
              className={clsx(
                'flex items-center gap-3 px-3 py-1.5 rounded border text-xs',
                entry.isWinner
                  ? 'border-amber-400 bg-amber-950/30 text-amber-200 font-black'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300',
                entry.playerId === myPlayerId && !entry.isWinner && 'border-emerald-500/60'
              )}
            >
              <span className="w-6 font-black">#{entry.placement}</span>
              <span className="flex-1 truncate">{entry.nickname}</span>
              {entry.playerId === myPlayerId && (
                <span className="text-emerald-400">{t.summary.youTag}</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-center gap-6 text-[11px] text-zinc-400">
        <span>
          {t.summary.roundsPlayed}: <b className="text-zinc-200">{roundNumber}</b>
        </span>
        <span>
          {t.summary.playersCount}: <b className="text-zinc-200">{players.length}</b>
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        {isHost ? (
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs cursor-pointer shadow-lg shadow-emerald-500/30"
          >
            {t.summary.playAgain}
          </button>
        ) : (
          <span className="text-xs text-amber-400 italic">{t.summary.waitingForHost}</span>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t.summary.leave}
        </button>
      </div>
    </div>
  );
};
