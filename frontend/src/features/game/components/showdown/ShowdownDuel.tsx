import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../../shared/theme/protocols';
import {
  OperatorChip,
  type PlateState,
  type ShowdownOperator,
} from './showdownParts';
import { type ShowdownTone, TONE } from './showdownTheme';
import type { ShowdownTrace } from './showdownTypes';

/** Who traces whom (or just the tested operator when no trace is being settled). */
export const ShowdownDuel: React.FC<{
  trace: ShowdownTrace | null;
  target: ShowdownOperator | null;
  tone: ShowdownTone;
  plateState: (isAccused: boolean) => PlateState;
}> = ({ trace, target, tone, plateState }) => {
  const { t } = useI18n();
  const cardCount = trace?.cards.length ?? 0;
  return (
    <>
      {trace ? (
        <div
          data-testid="trace-duel-line"
          className="flex min-w-0 items-center gap-1 sm:gap-1.5"
        >
          <OperatorChip
            operator={trace.accuser}
            role={t.verdict.traces}
            state={plateState(false)}
            tone={tone}
          />
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span
              aria-hidden="true"
              className={clsx('text-xs leading-none', TONE[tone].text)}
            >
              ⟶
            </span>
            <span
              className="whitespace-nowrap rounded border px-1 py-px text-[8px] font-black tracking-wider sm:text-[9px]"
              style={{
                color: PROTOCOL_HEX[trace.declaredProtocol],
                borderColor: PROTOCOL_HEX[trace.declaredProtocol],
              }}
            >
              {cardCount}× {trace.declaredProtocol.toUpperCase()}
            </span>
          </div>
          <OperatorChip
            operator={trace.accused}
            role={t.verdict.roleAccused}
            state={plateState(true)}
            tone={tone}
            mirrored
          />
        </div>
      ) : (
        target && (
          <OperatorChip
            operator={target}
            role={t.verdict.voltageTitle}
            state="neutral"
            tone={tone}
          />
        )
      )}
    </>
  );
};
