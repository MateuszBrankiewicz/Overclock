import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../../shared/theme/protocols';
import { classifyCard } from '../arena3d/hud/cardMarks';
import { Caption } from './Caption';
import { DecisionCaption } from './DecisionCaption';
import type { ShowdownOperator } from './showdownParts';
import {
  clampRisk,
  type ShowdownDecision,
  type ShowdownDischarge,
  type ShowdownStage,
  type ShowdownTrace,
} from './showdownTypes';

/** One caption line for the current beat, plus the decision buttons for the tested player. */
export const CaptionLine: React.FC<{
  stage: ShowdownStage;
  trace: ShowdownTrace | null;
  discharge: ShowdownDischarge | null;
  target: ShowdownOperator | null;
  decision: ShowdownDecision | null;
}> = ({ stage, trace, discharge, target, decision }) => {
  const { t } = useI18n();

  if (stage === 'scan' && trace) {
    return (
      <Caption
        main={
          <span className="text-amber-300 motion-safe:animate-pulse">
            {t.verdict.scanning}
          </span>
        }
        detail={
          <span style={{ color: PROTOCOL_HEX[trace.declaredProtocol] }}>
            {t.verdict.claim(trace.cards.length, trace.declaredProtocol)}
          </span>
        }
      />
    );
  }

  if (stage === 'verdict' && trace) {
    const loser = trace.bluffDetected ? trace.accused : trace.accuser;
    const bluffCount = trace.cards.filter(
      (c) => classifyCard(c.protocol, trace.declaredProtocol) === 'bluff',
    ).length;
    return (
      <Caption
        main={
          <span
            className={
              trace.bluffDetected ? 'text-red-300' : 'text-emerald-300'
            }
          >
            {trace.bluffDetected
              ? t.verdict.bluffReason(
                  bluffCount,
                  trace.cards.length,
                  trace.declaredProtocol,
                )
              : t.verdict.cleanReason(trace.declaredProtocol)}
          </span>
        }
        detail={
          <span
            data-testid="trace-verdict-subtitle"
            className={
              trace.bluffDetected ? 'text-red-200' : 'text-emerald-200'
            }
          >
            ⚡{' '}
            {loser.isLocal
              ? t.verdict.youVoltageTest
              : t.verdict.loserVoltageTest(loser.nickname)}
          </span>
        }
      />
    );
  }

  if (stage === 'decision') {
    return <DecisionCaption decision={decision} target={target} />;
  }

  if (!discharge) return null;
  const risk = clampRisk(discharge.riskLevel);

  if (stage === 'charge' || stage === 'roll') {
    return (
      <Caption
        main={
          <span className="text-amber-300">
            {stage === 'charge' ? t.discharge.charging : t.discharge.rolling}
          </span>
        }
        detail={<span className="text-red-300">{t.discharge.rule(risk)}</span>}
      />
    );
  }

  return (
    <Caption
      main={
        <span
          data-testid="discharge-result"
          className={clsx(
            discharge.overloaded
              ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]'
              : 'text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]',
          )}
        >
          {discharge.overloaded ? t.discharge.shorted : t.discharge.held}
        </span>
      }
      detail={
        <span className="text-zinc-300">
          {t.discharge.rolling}:{' '}
          <span className="text-white">{discharge.roll}</span>{' '}
          {discharge.overloaded ? '≤' : '>'} {risk}
          {!discharge.overloaded && (
            <span className="text-amber-300">
              {' '}
              · {t.discharge.riskNow(clampRisk(discharge.resultingRiskLevel))}
            </span>
          )}
        </span>
      }
    />
  );
};
