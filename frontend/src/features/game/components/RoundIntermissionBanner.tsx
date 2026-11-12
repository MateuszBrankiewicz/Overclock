import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { useCountdown } from '../hooks/useCountdown';
import type { CapacitorDischargedEvent, PlayerSeat } from '../schemas/gameEvents';

export interface RoundIntermissionBannerProps {
  roundNumber: number;
  players: PlayerSeat[];
  lastDischargeOutcome: CapacitorDischargedEvent | null;
  isHost?: boolean;
  hostId?: string | null;
  myPlayerId?: string | null;
  onLeave?: () => void;
  isDischargeCinematicActive?: boolean;
  onStartNextRound?: () => void;
  intermissionDeadlineUtc?: string | null;
  className?: string;
}

export const RoundIntermissionBanner: React.FC<RoundIntermissionBannerProps> = ({
  roundNumber,
  players,
  lastDischargeOutcome,
  isDischargeCinematicActive = false,
  intermissionDeadlineUtc = null,
  className,
}) => {
  const { t } = useI18n();
  const serverCountdown = useCountdown(intermissionDeadlineUtc, 10);
  const [localCountdown, setLocalCountdown] = useState<number>(3);

  useEffect(() => {
    if (intermissionDeadlineUtc || isDischargeCinematicActive) {
      return;
    }
    const interval = setInterval(() => {
      setLocalCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [intermissionDeadlineUtc, isDischargeCinematicActive, roundNumber]);

  const countdown = intermissionDeadlineUtc
    ? serverCountdown.secondsLeft
    : localCountdown;

  const activeCount = players.filter((p) => p.status === 'Active').length;
  const totalCount = players.length;

  const testedSeat = lastDischargeOutcome
    ? players.find((p) => p.playerId === lastDischargeOutcome.playerId)
    : null;
  const testedNick = testedSeat?.nickname ?? t.common.operator;

  const isOverloaded = Boolean(lastDischargeOutcome?.overloaded);
  const resultingRisk = lastDischargeOutcome?.resultingRiskLevel ?? 1;
  const riskPercent = Math.round((resultingRisk / 6) * 100);

  return (
    <div
      data-testid="round-intermission-banner"
      className={clsx(
        'flex flex-col items-center justify-center p-5 rounded-2xl border-2 font-mono transition-all duration-500 max-w-lg mx-auto w-full backdrop-blur-md shadow-2xl',
        isOverloaded
          ? 'bg-red-950/90 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
          : 'bg-zinc-950/95 border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.4)]',
        className
      )}
    >
      <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-2.5 mb-3 text-xs">
        <span className="font-black tracking-widest text-emerald-400 uppercase">
          {t.intermission.roundOverTitle} {roundNumber}
        </span>
        <span className="text-zinc-400 text-[11px] font-bold">
          {t.intermission.operatorsAlive}: {activeCount}/{totalCount}
        </span>
      </div>

      <div className="text-center space-y-1.5 my-2">
        {lastDischargeOutcome ? (
          isOverloaded ? (
            <div className="space-y-1">
              <span className="text-sm font-black text-red-400 tracking-wider block">
                ⚡ [{testedNick}] {t.intermission.operatorEliminated}
              </span>
              <span className="text-[11px] text-zinc-400">
                {t.intermission.breakdownDesc}
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-sm font-black text-emerald-400 tracking-wider block">
                🛡️ [{testedNick}] {t.intermission.survivedAttempt}
              </span>
              <span className="text-xs text-amber-300 font-bold block">
                {`${t.intermission.riskIncreased} ${resultingRisk}/6 (${riskPercent}%)`}
              </span>
            </div>
          )
        ) : (
          <span className="text-sm font-bold text-zinc-300">
            {t.intermission.roundOverTitle} {roundNumber}
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/80 w-full flex flex-col items-center gap-2">
        {!isDischargeCinematicActive ? (
          <div
            data-testid="intermission-countdown"
            className="flex flex-col items-center gap-1 text-cyan-300"
          >
            <span className="text-xs font-bold tracking-widest">⚡ {t.intermission.nextCycleAuto}</span>
            <span
              key={countdown}
              className="text-5xl sm:text-6xl font-black text-white tabular-nums drop-shadow-[0_0_18px_rgba(34,211,238,0.9)] animate-pulse"
            >
              {countdown}
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">{t.intermission.dischargeResolving}</span>
        )}
      </div>
    </div>
  );
};
