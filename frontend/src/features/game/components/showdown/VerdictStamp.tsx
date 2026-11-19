import clsx from 'clsx';
import { motion } from 'motion/react';
import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import type { ShowdownTrace } from './showdownTypes';

/** Verdict stamp punched in above the bar; the 3D scene floods with the same colour. */
export const VerdictStamp: React.FC<{
  trace: ShowdownTrace;
  reducedMotion: boolean;
}> = ({ trace, reducedMotion }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-x-0 bottom-[8.5rem] z-40 flex justify-center pointer-events-none sm:bottom-[7rem]">
      <motion.span
        data-testid="trace-verdict-title"
        initial={
          reducedMotion ? false : { opacity: 0, scale: 2.2, rotate: -14 }
        }
        animate={{ opacity: 1, scale: 1, rotate: -3 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 480, damping: 20 }
        }
        className={clsx(
          'rounded-lg border-[3px] border-double bg-black/75 px-4 py-1 font-mono text-2xl font-black tracking-widest whitespace-nowrap backdrop-blur-sm sm:text-4xl',
          trace.bluffDetected
            ? 'border-red-500 text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.85)]'
            : 'border-emerald-400 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.85)]',
        )}
      >
        {trace.bluffDetected
          ? t.verdict.bluffDetected
          : t.verdict.cleanTransmission}
      </motion.span>
    </div>
  );
};
