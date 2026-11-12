import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CapacitorDischargedEvent, PlayerSeat } from '../schemas/gameEvents';
import { getIntermissionFallback, HOST_GRACE_SECONDS } from '../utils/intermissionFallback';
import { IntermissionFallbackNotice } from './IntermissionFallbackNotice';

export interface RoundIntermissionBannerProps {
  roundNumber: number;
  players: PlayerSeat[];
  lastDischargeOutcome: CapacitorDischargedEvent | null;
  isHost: boolean;
  hostId?: string | null;
  myPlayerId?: string | null;
  onLeave?: () => void;
  isDischargeCinematicActive: boolean;
  onStartNextRound: () => void;
  className?: string;
}

export const RoundIntermissionBanner: React.FC<RoundIntermissionBannerProps> = ({
  roundNumber,
  players,
  lastDischargeOutcome,
  isHost,
  hostId = null,
  myPlayerId = null,
  onLeave,
  isDischargeCinematicActive,
  onStartNextRound,
  className,
}) => {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState<number>(3);
  const [graceElapsed, setGraceElapsed] = useState(false);
  const autoStartedRoundRef = useRef<number>(-1);

  const activeCount = players.filter((p) => p.status === 'Active').length;
  const totalCount = players.length;

  const testedSeat = lastDischargeOutcome
    ? players.find((p) => p.playerId === lastDischargeOutcome.playerId)
    : null;
  const testedNick = testedSeat?.nickname ?? 'Operator';

  useEffect(() => {
    // Only begin the countdown when the 3D discharge/death animation has completed
    if (isDischargeCinematicActive) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDischargeCinematicActive, roundNumber]);

  useEffect(() => {
    // Trigger automatic next round start exactly once when countdown hits 0
    if (countdown === 0 && !isDischargeCinematicActive && isHost) {
      if (autoStartedRoundRef.current !== roundNumber) {
        autoStartedRoundRef.current = roundNumber;
        onStartNextRound();
      }
    }
  }, [countdown, isDischargeCinematicActive, isHost, roundNumber, onStartNextRound]);

  useEffect(() => {
    // Non-hosts: after the countdown ends, give the host a grace period before declaring them gone
    if (countdown !== 0 || isDischargeCinematicActive || isHost) return;
    const timer = setTimeout(() => setGraceElapsed(true), HOST_GRACE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [countdown, isDischargeCinematicActive, isHost, roundNumber]);

  const fallback = getIntermissionFallback({
    countdown: isDischargeCinematicActive ? 1 : countdown,
    graceElapsed,
    isHost,
    hostId,
    myPlayerId,
    players,
  });

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
                Dielectric breakdown occurred. Circuit opened.
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
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 animate-pulse">
            <span>⚡ {t.intermission.nextCycleAuto}</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 font-black text-white text-sm">
              {countdown}s
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">Discharge sequence resolving...</span>
        )}

        <IntermissionFallbackNotice
          fallback={fallback}
          onStartNextRound={onStartNextRound}
          onLeave={onLeave}
        />

        {isHost && countdown === 0 && (
          <button
            type="button"
            onClick={onStartNextRound}
            className="mt-1 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer shadow-md transition-all active:scale-95"
          >
            [{t.intermission.fallbackStart}]
          </button>
        )}
      </div>
    </div>
  );
};
