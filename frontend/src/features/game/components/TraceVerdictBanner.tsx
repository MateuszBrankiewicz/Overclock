import { motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CardProtocol } from '../schemas/gameEvents';
import { verdictVisibleAtMs } from '../utils/cinematicTiming';
import { prefersReducedMotion } from './arena3d/hud/motion';

export interface TraceVerdictBannerProps {
  bluffDetected: boolean;
  accuserNickname: string;
  accusedNickname: string;
  loserNickname: string;
  isLocalLoser: boolean;
  declaredProtocol: CardProtocol;
  startedAtMs: number;
  cardCount: number;
  onSkip?: () => void;
}

/**
 * High-visibility banner displayed once all contested cards have flipped during TRACE reveal.
 * Displays whether a bluff was caught or transmission was clean and who faces the voltage test.
 */
export const TraceVerdictBanner: React.FC<TraceVerdictBannerProps> = ({
  bluffDetected,
  loserNickname,
  isLocalLoser,
  startedAtMs,
  cardCount,
  onSkip,
}) => {
  const { t } = useI18n();
  const visibleAt = useMemo(
    () => verdictVisibleAtMs(cardCount, startedAtMs),
    [cardCount, startedAtMs]
  );

  const [isVisible, setIsVisible] = useState(() => Date.now() >= visibleAt);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const remaining = Math.max(0, visibleAt - Date.now());
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [visibleAt]);

  if (!isVisible) {
    return null;
  }

  const title = bluffDetected ? t.verdict.bluffDetected : t.verdict.cleanTransmission;
  const subtitle = isLocalLoser
    ? t.verdict.youVoltageTest
    : t.verdict.loserVoltageTest(loserNickname);

  const borderClass = bluffDetected
    ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.55)]'
    : 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.55)]';

  const titleClass = bluffDetected
    ? 'text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]'
    : 'text-emerald-400 drop-shadow-[0_0_16px_rgba(52,211,153,0.9)]';

  const subtitleClass = bluffDetected ? 'text-red-200' : 'text-emerald-200';

  return (
    <motion.div
      data-testid="trace-verdict-banner"
      role="status"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25 }}
      className="fixed left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 z-40 w-[min(92vw,28rem)] pointer-events-none"
    >
      <div
        onClick={onSkip}
        className={`flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl border-2 bg-black/90 font-mono text-center backdrop-blur-md pointer-events-auto cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98] ${borderClass}`}
      >
        <span
          data-testid="trace-verdict-title"
          className={`text-2xl sm:text-3xl font-black tracking-widest ${titleClass}`}
        >
          {title}
        </span>
        <span
          data-testid="trace-verdict-subtitle"
          className={`text-xs sm:text-sm font-bold tracking-wider ${subtitleClass}`}
        >
          {subtitle}
        </span>
        {onSkip && (
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest mt-1 hover:text-white">
            [SPACE / TAP TO CONTINUE]
          </span>
        )}
      </div>
    </motion.div>
  );
};
