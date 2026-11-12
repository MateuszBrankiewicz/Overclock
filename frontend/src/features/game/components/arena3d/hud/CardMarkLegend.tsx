import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { type CardMark, MARK_COLOR } from './cardMarks';

const MARKS: CardMark[] = ['match', 'wild', 'bluff'];

/** Tiny legend for the match / wild / bluff card marks. */
export const CardMarkLegend: React.FC = () => {
  const { t } = useI18n();
  const labels: Record<CardMark, string> = {
    match: t.controls.legendMatch,
    wild: t.controls.legendWild,
    bluff: t.controls.legendBluff,
  };
  return (
    <div
      data-testid="card-mark-legend"
      className="absolute bottom-16 sm:bottom-[4.5rem] left-3 z-30 flex gap-2 px-2 py-1 rounded-lg bg-black/70 border border-zinc-800 text-[9px] uppercase tracking-wider pointer-events-none"
    >
      {MARKS.map((m) => (
        <span key={m} className="flex items-center gap-1 text-zinc-300">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: MARK_COLOR[m], boxShadow: `0 0 6px ${MARK_COLOR[m]}` }}
          />
          {labels[m]}
        </span>
      ))}
    </div>
  );
};
