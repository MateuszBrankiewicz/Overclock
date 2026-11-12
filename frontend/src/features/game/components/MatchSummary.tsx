import clsx from 'clsx';
import { LogOut, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import { prefersReducedMotion } from '../../../shared/lib/motion';
import { HudButton, HudPanel } from '../../../shared/ui';
import type { PlayerSeat } from '../schemas/gameEvents';
import { resolveSeatCharacter } from '../utils/characterCatalog';
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
  const isLocalWinner = winner?.playerId === myPlayerId;
  const myEntry = podium.find((entry) => entry.playerId === myPlayerId);
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      data-testid="match-summary"
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: reducedMotion ? 0 : 1.2, duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto"
    >
      <HudPanel
        tone={isLocalWinner ? 'accent' : 'default'}
        className="p-5 text-center space-y-4 font-mono shadow-[0_0_50px_rgba(16,185,129,0.3)]"
      >
        <div>
          <span className="text-xs font-black tracking-widest text-zinc-400 block mb-1">
            {t.summary.title}
          </span>
          {isLocalWinner ? (
            <h2 className="text-2xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
              {t.summary.youWon}
            </h2>
          ) : myEntry && !myEntry.isWinner ? (
            <h2 className="text-base font-bold text-zinc-300 tracking-wider">
              {t.summary.youLost(myEntry.placement)}
            </h2>
          ) : null}
        </div>

        {winner && (
          <div className="space-y-1.5 py-1">
            <Trophy className="w-9 h-9 mx-auto text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <p className="text-[11px] uppercase text-zinc-400 font-bold tracking-wider">
              {t.summary.winnerLabel}
            </p>
            <p className="text-2xl font-black text-emerald-300 tracking-wider break-words">
              {winner.nickname}
              {winner.playerId === myPlayerId && ` ${t.summary.youTag}`}
            </p>
          </div>
        )}

        <div className="text-left space-y-2">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {t.summary.podiumTitle}
          </p>
          <ol className="space-y-1.5">
            {podium.map((entry, index) => {
              const char = resolveSeatCharacter(entry.characterId);
              return (
                <motion.li
                  key={entry.playerId}
                  initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 1.2 + (podium.length - 1 - index) * 0.12,
                    duration: 0.25,
                  }}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded border text-xs',
                    entry.isWinner
                      ? 'border-amber-400 bg-amber-950/30 text-amber-200 font-black shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-300',
                    entry.playerId === myPlayerId && !entry.isWinner && 'border-emerald-500/60'
                  )}
                >
                  <span className="w-6 font-black tabular-nums">#{entry.placement}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: char.primaryColor }}
                    title={char.codename}
                  />
                  <span className="flex-1 truncate">{entry.nickname}</span>
                  <span className="text-[10px] text-zinc-500 font-bold">{char.codename}</span>
                  {entry.playerId === myPlayerId && (
                    <span className="text-emerald-400 font-bold">{t.summary.youTag}</span>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </div>

        <div className="flex justify-center gap-6 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-3">
          <span>
            {t.summary.roundsPlayed}: <b className="text-zinc-200">{roundNumber}</b>
          </span>
          <span>
            {t.summary.playersCount}: <b className="text-zinc-200">{players.length}</b>
          </span>
        </div>

        <div className="flex flex-col items-center gap-2.5 pt-1">
          {isHost ? (
            <HudButton
              variant="primary"
              size="lg"
              onClick={onPlayAgain}
              className="w-full text-xs shadow-lg shadow-emerald-500/20"
            >
              {t.summary.playAgain}
            </HudButton>
          ) : (
            <span className="text-xs text-amber-400 italic py-1">
              {t.summary.waitingForHost}
            </span>
          )}
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 cursor-pointer transition-colors pt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.summary.leave}</span>
          </button>
        </div>
      </HudPanel>
    </motion.div>
  );
};
