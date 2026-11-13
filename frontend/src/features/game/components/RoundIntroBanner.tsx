import { motion } from 'motion/react';
import React, { useEffect } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CardProtocol } from '../schemas/gameEvents';
import { ROUND_INTRO_MS } from '../utils/cinematicTiming';

export interface RoundIntroBannerProps {
  roundNumber: number;
  protocol: CardProtocol | null;
  startedAtMs: number;
  onDone: () => void;
}

/** "Round N — protocol X" announcement shown when a round starts. */
export const RoundIntroBanner: React.FC<RoundIntroBannerProps> = ({
  roundNumber,
  protocol,
  startedAtMs,
  onDone,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    const remaining = ROUND_INTRO_MS - (Date.now() - startedAtMs);
    const timer = setTimeout(onDone, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [startedAtMs, onDone]);

  return (
    <motion.div
      data-testid="round-intro-banner"
      role="status"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-1/2 top-[26%] sm:top-[30%] -translate-x-1/2 -translate-y-1/2 z-40 w-[min(92vw,26rem)] pointer-events-none"
    >
      <div className="flex flex-col items-center gap-1 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl border-2 border-cyan-400 bg-black/85 font-mono text-center shadow-[0_0_40px_rgba(34,211,238,0.55)]">
        <span className="text-xs sm:text-sm font-black tracking-[0.25em] sm:tracking-[0.35em] text-cyan-300">
          {t.hud.roundIntroTitle(roundNumber)}
        </span>
        {protocol && (
          <>
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400">
              {t.hud.roundIntroProtocol}
            </span>
            <span
              data-testid="round-intro-protocol"
              className="text-3xl sm:text-5xl font-black tracking-widest text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.9)]"
            >
              {protocol.toUpperCase()}
            </span>
            <span className="text-[11px] text-zinc-300">{t.hud.roundIntroHint}</span>
          </>
        )}
      </div>
    </motion.div>
  );
};
