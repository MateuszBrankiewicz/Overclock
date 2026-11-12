import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { buildDiceSequence, DICE_FRAME_MS } from './diceRoll';
import { prefersReducedMotion } from './motion';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export const DieFace: React.FC<{ face: number; settled: boolean; danger: boolean }> = ({
  face,
  settled,
  danger,
}) => (
  <div
    data-testid="dice-face"
    data-face={face}
    className={clsx(
      'grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16 p-2 rounded-xl border-2 bg-zinc-950',
      danger ? 'border-red-500' : 'border-amber-400',
      !settled && 'animate-pulse'
    )}
  >
    {Array.from({ length: 9 }).map((_, i) => (
      <span
        key={i}
        className={clsx(
          'rounded-full',
          PIPS[face]?.includes(i) ? (danger ? 'bg-red-400' : 'bg-amber-300') : 'bg-transparent'
        )}
      />
    ))}
  </div>
);

export interface DiceRollProps {
  roll: number;
  /** Whether the roll overloaded the capacitor (tints the die once settled). */
  overloaded: boolean;
  reducedMotion?: boolean;
}

/** ~1 s D6 roll that cycles faces and lands on the server-provided result. */
export const DiceRoll: React.FC<DiceRollProps> = ({ roll, overloaded, reducedMotion }) => {
  const { t } = useI18n();
  const skip = reducedMotion ?? prefersReducedMotion();
  const sequence = useMemo(() => buildDiceSequence(roll), [roll]);
  const [index, setIndex] = useState(skip ? sequence.length - 1 : 0);

  useEffect(() => {
    if (skip) return;
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, sequence.length - 1));
    }, DICE_FRAME_MS);
    return () => clearInterval(id);
  }, [sequence, skip]);

  const settled = index >= sequence.length - 1;
  return (
    <div
      data-testid="dice-roll"
      role="img"
      aria-label={`${t.controls.diceRolling}: ${roll}`}
      className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
    >
      <DieFace face={sequence[index]} settled={settled} danger={settled && overloaded} />
    </div>
  );
};
