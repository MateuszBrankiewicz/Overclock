import { AlertCircle, Clock, Sparkles } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';

export interface TurnBannerProps {
  isMyTurn: boolean;
  activePlayerNickname?: string;
  currentTargetProtocol: string | null;
  lastLog?: string | null;
  isEliminated?: boolean;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  isMyTurn,
  activePlayerNickname,
  currentTargetProtocol,
  lastLog,
  isEliminated,
}) => {
  const { t } = useI18n();

  if (isEliminated) {
    return (
      <div className="w-full bg-red-950/80 border border-red-500/80 rounded-lg p-3 text-center text-xs font-mono text-red-300 font-bold shadow-lg animate-pulse">
        {t.table.spectatorAlert}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2 font-mono">
      {/* Turn indicator bar */}
      <div
        className={`w-full rounded-lg p-3 border flex flex-wrap items-center justify-between gap-3 text-xs transition-all shadow-md ${
          isMyTurn
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
            : 'bg-zinc-900/80 border-zinc-700 text-zinc-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isMyTurn ? (
            <>
              <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
              <div>
                <span className="font-extrabold text-emerald-200 text-sm tracking-wider block">
                  {t.table.yourTurnTitle}
                </span>
                <span className="text-[11px] text-emerald-300/80">
                  {t.table.yourTurnHelp}
                </span>
              </div>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-zinc-400" />
              <div>
                <span className="font-bold text-zinc-300">
                  {t.table.opponentTurn}{' '}
                  <strong className="text-amber-400 font-extrabold">
                    {activePlayerNickname ?? '...'}
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-bold">
            {t.table.targetProtocol}
          </span>
          <span className="px-2.5 py-1 bg-amber-950/90 text-amber-300 font-black rounded border border-amber-500 text-xs shadow-[0_0_10px_rgba(245,158,11,0.4)]">
            {currentTargetProtocol ?? 'ALPHA'}
          </span>
        </div>
      </div>

      {/* Hub log / diagnostic alert message if present */}
      {lastLog && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-zinc-800 rounded text-[11px] text-zinc-400">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{lastLog}</span>
        </div>
      )}
    </div>
  );
};
