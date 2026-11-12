import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { type CountdownState, useCountdown } from '../../../hooks/useCountdown';
import { useGameStore } from '../../../stores/useGameStore';

export interface TurnUrgencyCountdownViewProps {
  countdown: CountdownState;
  isMyTurn: boolean;
}

/** Big centred countdown for the last seconds of a turn, so nobody misses the timeout. */
export const TurnUrgencyCountdownView: React.FC<TurnUrgencyCountdownViewProps> = ({
  countdown,
  isMyTurn,
}) => {
  const { t } = useI18n();
  if (!countdown.isActive || !countdown.isCritical) return null;

  return (
    <div
      data-testid="turn-urgency-countdown"
      aria-live="assertive"
      className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center pointer-events-none select-none"
    >
      {isMyTurn && (
        <span className="mb-1 px-3 py-1 rounded-md bg-red-950/85 border border-red-500/80 text-[11px] sm:text-xs font-black tracking-[0.3em] text-red-300">
          {t.hud.hurryUp}
        </span>
      )}
      <span
        key={countdown.secondsLeft}
        className={
          isMyTurn
            ? 'text-7xl sm:text-8xl font-black tabular-nums text-red-400 drop-shadow-[0_0_28px_rgba(239,68,68,0.95)] animate-pulse'
            : 'text-4xl sm:text-5xl font-black tabular-nums text-amber-300/90 drop-shadow-[0_0_18px_rgba(245,158,11,0.8)]'
        }
      >
        {countdown.secondsLeft}
      </span>
    </div>
  );
};

export interface TurnUrgencyCountdownProps {
  isMyTurn: boolean;
}

export const TurnUrgencyCountdown: React.FC<TurnUrgencyCountdownProps> = ({ isMyTurn }) => {
  const turnDeadlineUtc = useGameStore((s) => s.turnDeadlineUtc);
  const countdown = useCountdown(turnDeadlineUtc);
  return <TurnUrgencyCountdownView countdown={countdown} isMyTurn={isMyTurn} />;
};
