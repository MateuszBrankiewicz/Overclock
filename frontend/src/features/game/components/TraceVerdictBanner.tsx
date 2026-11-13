import { motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../shared/theme/protocols';
import type { CardProtocol } from '../schemas/gameEvents';
import { verdictVisibleAtMs } from '../utils/cinematicTiming';
import { prefersReducedMotion } from './arena3d/hud/motion';

export interface TraceVerdictBannerProps {
  bluffDetected: boolean;
  accuserNickname: string;
  accusedNickname: string;
  loserNickname: string;
  isLocalLoser: boolean;
  isLocalAccuser?: boolean;
  isLocalAccused?: boolean;
  declaredProtocol: CardProtocol;
  startedAtMs: number;
  cardCount: number;
  onSkip?: () => void;
}

/** Static centring wrapper: motion's own transforms would override translate utilities. */
const BannerSlot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-x-0 top-[28%] -translate-y-1/2 z-40 flex justify-center px-4 pointer-events-none">
    {children}
  </div>
);

const DuelLine: React.FC<{
  accuser: string;
  accused: string;
  verb: string;
  size: 'lg' | 'sm';
}> = ({ accuser, accused, verb, size }) => (
  <div
    data-testid="trace-duel-line"
    className={`flex items-center justify-center gap-2 font-black tracking-wider uppercase ${
      size === 'lg' ? 'text-base sm:text-xl' : 'text-[11px] sm:text-xs'
    }`}
  >
    <span className="min-w-0 truncate text-amber-300">{accuser}</span>
    <span className="flex items-center gap-1 text-zinc-400 shrink-0">
      <span className={size === 'lg' ? 'text-[10px] sm:text-xs tracking-[0.25em]' : 'text-[9px]'}>
        {verb}
      </span>
      <span aria-hidden="true">⟶</span>
    </span>
    <span className="min-w-0 truncate text-white">{accused}</span>
  </div>
);

/**
 * Two-phase overlay of the TRACE reveal. While the contested cards are still face-down it announces
 * the duel (who traces whom, what was claimed) with a scan bar running down to the verdict; once all
 * cards have flipped it shows whether a bluff was caught and who faces the voltage test.
 */
export const TraceVerdictBanner: React.FC<TraceVerdictBannerProps> = ({
  bluffDetected,
  accuserNickname,
  accusedNickname,
  loserNickname,
  isLocalLoser,
  isLocalAccuser = false,
  isLocalAccused = false,
  declaredProtocol,
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
  const [scanMs] = useState(() => Math.max(0, visibleAt - Date.now()));
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const remaining = Math.max(0, visibleAt - Date.now());
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [visibleAt]);

  const accuser = isLocalAccuser ? t.verdict.you : accuserNickname;
  const accused = isLocalAccused ? t.verdict.you : accusedNickname;
  const protocolColor = PROTOCOL_HEX[declaredProtocol] ?? '#f59e0b';

  if (!isVisible) {
    return (
      <BannerSlot>
        <motion.div
          data-testid="trace-duel-banner"
          role="status"
          initial={reducedMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
          className="w-[min(92vw,30rem)] pointer-events-none"
        >
          <div
            onClick={onSkip}
            className="flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-amber-500/90 bg-black/90 font-mono text-center backdrop-blur-md shadow-[0_0_36px_rgba(245,158,11,0.45)] pointer-events-auto cursor-pointer select-none"
          >
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 animate-pulse">
              {t.verdict.traceTitle}
            </span>
            <DuelLine accuser={accuser} accused={accused} verb={t.verdict.traces} size="lg" />
            <span className="text-[11px] font-bold tracking-wider" style={{ color: protocolColor }}>
              {t.verdict.claim(cardCount, declaredProtocol)}
            </span>
            <div className="w-full space-y-1">
              <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: scanMs / 1000, ease: 'easeIn' }}
                />
              </div>
              <span className="block text-[9px] font-bold tracking-[0.3em] text-zinc-500">
                {t.verdict.scanning}
              </span>
            </div>
          </div>
        </motion.div>
      </BannerSlot>
    );
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
    <BannerSlot>
      <motion.div
        data-testid="trace-verdict-banner"
        role="status"
        initial={reducedMotion ? false : { opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18 }
        }
        className="w-[min(92vw,30rem)] pointer-events-none"
      >
        <div
          onClick={onSkip}
          className={`flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl border-2 bg-black/90 font-mono text-center backdrop-blur-md pointer-events-auto cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98] ${borderClass}`}
        >
          <DuelLine accuser={accuser} accused={accused} verb={t.verdict.traces} size="sm" />
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
    </BannerSlot>
  );
};
