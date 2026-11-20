import clsx from 'clsx';
import { motion } from 'motion/react';
import React, { useState } from 'react';

import { type ShowdownTone, TONE } from './showdownTheme';

/** Thin bar on the top edge that fills up towards the next beat. */
export const ProgressEdge: React.FC<{
  progress: { fromMs: number; toMs: number } | null;
  tone: ShowdownTone;
  reducedMotion: boolean;
}> = ({ progress, tone, reducedMotion }) => {
  const [start] = useState(() => {
    if (!progress) return { done: 1, leftMs: 0 };
    const span = Math.max(1, progress.toMs - progress.fromMs);
    const done = Math.min(
      1,
      Math.max(0, (Date.now() - progress.fromMs) / span),
    );
    return { done, leftMs: Math.max(0, progress.toMs - Date.now()) };
  });
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-1 bg-zinc-800/80"
    >
      <motion.div
        className={clsx('h-full', TONE[tone].bar)}
        initial={
          reducedMotion || !progress ? false : { width: `${start.done * 100}%` }
        }
        animate={{ width: '100%' }}
        transition={{
          duration: reducedMotion ? 0 : start.leftMs / 1000,
          ease: 'linear',
        }}
      />
    </div>
  );
};
