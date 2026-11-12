import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { HudPanel } from '../../../../../shared/ui';
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
    <HudPanel
      data-testid={testId}
      data-critical={critical ? 'true' : 'false'}
      role="timer"
      aria-label={label}
      tone={critical ? 'danger' : 'accent'}
      cornerBrackets={false}
      className={clsx(
        'w-44 sm:w-56 px-2.5 py-1 text-[11px] sm:text-xs font-bold tracking-wider',
        critical && 'motion-safe:animate-pulse'
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
    </HudPanel>
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
