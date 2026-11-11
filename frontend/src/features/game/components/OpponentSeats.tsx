import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { PlayerSeat } from '../schemas/gameEvents';
import { CapacitorMeter } from './CapacitorMeter';
import { ExploitChipSlot } from './ExploitChipSlot';
import { PcbCard } from './PcbCard';

export interface OpponentSeatsProps {
  seats: PlayerSeat[];
  myPlayerId: string | null;
  activePlayerId: string | null;
}

export const OpponentSeats: React.FC<OpponentSeatsProps> = ({
  seats,
  myPlayerId,
  activePlayerId,
}) => {
  const { language } = useI18n();
  const opponents = seats.filter((s) => s.playerId !== myPlayerId);

  if (opponents.length === 0) {
    return (
      <div className="text-zinc-500 font-mono text-xs italic text-center py-2">
        {language === 'pl'
          ? 'Oczekiwanie na dołączenie rywali do stołu...'
          : 'AWAITING OPPONENTS TO ENTER SEATS...'}
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    if (language === 'pl') {
      if (status === 'Active') return 'W GRZE';
      if (status === 'Ready') return 'GOTOWY';
      if (status === 'Eliminated') return 'ODPADŁ';
      return status;
    }
    return status;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full font-mono">
      {opponents.map((opp) => {
        const isTurn = activePlayerId === opp.playerId;
        return (
          <div
            key={opp.playerId}
            className={clsx(
              'rounded border p-2.5 flex flex-col justify-between bg-zinc-950/80 transition-all',
              isTurn
                ? 'border-emerald-500/80 shadow-emerald-500/20 shadow-md ring-1 ring-emerald-500/50'
                : 'border-zinc-800'
            )}
          >
            <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
              <span className="font-bold text-zinc-200">{opp.nickname}</span>
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.2 rounded font-bold',
                  opp.status === 'Active'
                    ? 'text-emerald-400 bg-emerald-950/40'
                    : 'text-amber-400 bg-amber-950/40'
                )}
              >
                {getStatusLabel(opp.status)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-2 min-h-[46px] overflow-x-auto">
              {opp.handCount === 0 ? (
                <span className="text-[10px] text-zinc-600 italic">
                  {language === 'pl' ? 'Brak kart' : 'No packets'}
                </span>
              ) : (
                Array.from({ length: Math.min(opp.handCount, 8) }).map((_, i) => (
                  <PcbCard key={i} faceDown size="sm" hoverable={false} className="shrink-0" />
                ))
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 mt-1">
              <span>
                {language === 'pl' ? 'KARTY' : 'PACKETS'}: {opp.handCount}
              </span>
              {isTurn && (
                <span className="text-emerald-400 font-bold animate-pulse">
                  ● {language === 'pl' ? 'RUCH GRACZA' : 'ACTIVE TURN'}
                </span>
              )}
            </div>

            {/* Capacitor Voltage & Exploit Chip */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-900 mt-1">
              <CapacitorMeter
                riskLevel={opp.riskLevel ?? 1}
                label={`${opp.nickname} BUS`}
                size="sm"
                showBreakdownRisk={false}
              />
              {opp.exploit && (
                <ExploitChipSlot
                  exploit={opp.exploit}
                  canActivate={false}
                  size="sm"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
