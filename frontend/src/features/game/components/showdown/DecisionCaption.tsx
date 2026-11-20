import clsx from 'clsx';
import { ShieldCheck, Zap } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import { HudButton } from '../../../../shared/ui';
import { useCountdown } from '../../hooks/useCountdown';
import { Caption } from './Caption';
import type { ShowdownOperator } from './showdownParts';
import { clampRisk, type ShowdownDecision } from './showdownTypes';

export const DecisionCaption: React.FC<{
  decision: ShowdownDecision | null;
  target: ShowdownOperator | null;
}> = ({ decision, target }) => {
  const { t } = useI18n();
  const countdown = useCountdown(decision?.deadlineUtc ?? null);
  const risk = clampRisk(target?.riskLevel ?? 1);
  const isLocal = Boolean(decision && target?.isLocal);

  const buttons = isLocal && decision && (
    <div className="flex shrink-0 items-center gap-1.5">
      {decision.canUseGroundWire && decision.onDeployGroundWire && (
        <HudButton
          variant="primary"
          size="sm"
          onClick={decision.onDeployGroundWire}
          aria-label={t.voltage.useGroundWire}
          title={t.voltage.useGroundWire}
          className="shadow-[0_0_16px_rgba(16,185,129,0.6)]"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span>{t.verdict.groundWireShort}</span>
        </HudButton>
      )}
      {decision.onTriggerDischarge && (
        <HudButton
          variant="warning"
          size="sm"
          onClick={decision.onTriggerDischarge}
          aria-label={`${t.voltage.triggerDischarge} (D6)`}
          title={t.voltage.triggerDischarge}
          className="shadow-[0_0_20px_rgba(245,158,11,0.8)]"
        >
          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>{t.verdict.dischargeShort} (D6)</span>
        </HudButton>
      )}
    </div>
  );

  return (
    <Caption
      main={
        <span className="text-amber-300 motion-safe:animate-pulse">
          {!decision || !target
            ? t.verdict.awaiting
            : isLocal
              ? t.verdict.yourDecision
              : t.verdict.deciding(target.nickname)}
        </span>
      }
      detail={
        <span className="flex items-center gap-2">
          <span className="truncate text-red-300">
            {t.discharge.rule(risk)}
          </span>
          {countdown.isActive && (
            <span
              role="timer"
              aria-label={t.hud.dischargeTimer}
              data-testid="discharge-timer"
              className="flex min-w-[3.5rem] flex-1 items-center gap-1.5"
            >
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className={clsx(
                    'block h-full transition-[width] duration-200',
                    countdown.secondsLeft <= 2 ? 'bg-red-500' : 'bg-amber-400',
                  )}
                  style={{ width: `${Math.round(countdown.fraction * 100)}%` }}
                />
              </span>
              <span className="font-black tabular-nums text-zinc-200">
                {countdown.secondsLeft}
                {t.hud.secondsShort}
              </span>
            </span>
          )}
        </span>
      }
      aside={buttons}
    />
  );
};
