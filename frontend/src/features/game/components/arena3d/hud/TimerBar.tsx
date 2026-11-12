import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import type { CountdownState } from '../../../hooks/useCountdown';
import { useCountdown } from '../../../hooks/useCountdown';

export interface TimerBarProps {
  label: string;
  countdown: CountdownState;
  testId?: string;
}

/** Presentational visor bar: turns red and pulses during the last 5 seconds. */
export const TimerBar: React.FC<TimerBarProps> = ({ label, countdown, testId }) => {
  const { t } = useI18n();
  if (!countdown.isActive) return null;
  const critical = countdown.isCritical;
  return (
    <div
      data-testid={testId}
      data-critical={critical ? 'true' : 'false'}
      role="timer"
      aria-label={label}
      className={clsx(
        'w-44 sm:w-56 px-2.5 py-1 rounded-lg border bg-black/85 backdrop-blur-md text-[10px] font-bold tracking-wider',
        critical
          ? 'border-red-500 text-red-300 animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.7)]'
          : 'border-zinc-700 text-emerald-300'
      )}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{`${countdown.secondsLeft}${t.hud.secondsShort}`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
        <div
          className={clsx(
            'h-full transition-[width] duration-200',
            critical ? 'bg-red-500' : 'bg-emerald-400'
          )}
          style={{ width: `${Math.round(countdown.fraction * 100)}%` }}
        />
      </div>
    </div>
  );
};

export interface TimerHudProps {
  deadlineUtc: string | null;
  fullSeconds?: number;
  label: string;
  testId?: string;
}

export const TimerHud: React.FC<TimerHudProps> = ({ deadlineUtc, fullSeconds, label, testId }) => {
  const countdown = useCountdown(deadlineUtc, fullSeconds);
  return <TimerBar label={label} countdown={countdown} testId={testId} />;
};
