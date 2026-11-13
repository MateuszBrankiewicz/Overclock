import { motion } from 'motion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import {
  DISCHARGE_CHARGE_MS,
  type DischargeStage,
  dischargeStageAt,
  dischargeStrikeDelayMs,
  DRUM_SPINDOWN_MS,
} from '../utils/cinematicTiming';
import { prefersReducedMotion } from './arena3d/hud/motion';

export interface DischargeSequenceBannerProps {
  targetNickname: string;
  isLocalTarget: boolean;
  roll: number;
  riskLevel: number;
  overloaded: boolean;
  resultingRiskLevel: number;
  startedAtMs: number;
  onSkip?: () => void;
}

const clampRisk = (risk: number) => Math.max(1, Math.min(6, risk));

/** Follows the discharge timeline with one timer per stage boundary (no per-frame renders). */
function useDischargeStage(startedAtMs: number, reducedMotion: boolean): DischargeStage {
  const [stage, setStage] = useState<DischargeStage>(() =>
    dischargeStageAt(Date.now() - startedAtMs, reducedMotion)
  );
  useEffect(() => {
    // Each timer sets its stage explicitly: timers may fire a hair early, so recomputing from the
    // clock could miss a boundary and skip a stage.
    const steps: Array<[DischargeStage, number]> = [
      ['roll', DISCHARGE_CHARGE_MS],
      ['strike', dischargeStrikeDelayMs(reducedMotion)],
    ];
    const timers = steps
      .filter(([next]) => next === 'strike' || !reducedMotion)
      .map(([next, at]) =>
        setTimeout(() => setStage(next), Math.max(0, startedAtMs + at - Date.now()))
      );
    return () => timers.forEach(clearTimeout);
  }, [startedAtMs, reducedMotion]);
  return stage;
}

/** Six capacitor chambers; the first `risk` ones are live. Lit one by one while charging. */
const ChamberRow: React.FC<{ risk: number; roll: number | null; charging: boolean }> = ({
  risk,
  roll,
  charging,
}) => (
  <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => {
      const face = i + 1;
      const isLive = face <= risk;
      const isHit = roll === face;
      return (
        <motion.span
          key={face}
          initial={charging ? { opacity: 0.15, scale: 0.6 } : false}
          animate={{ opacity: 1, scale: isHit ? 1.3 : 1 }}
          transition={{ delay: charging ? (i * DISCHARGE_CHARGE_MS) / 6000 : 0, duration: 0.18 }}
          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-black ${
            isLive
              ? 'border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
              : 'border-zinc-600 bg-zinc-900/80 text-zinc-400'
          } ${isHit ? 'ring-2 ring-white' : ''}`}
        >
          {face}
        </motion.span>
      );
    })}
  </div>
);

/** A d6 face that tumbles through numbers and slows down until the strike. */
const TumblingDie: React.FC<{ startedAtMs: number }> = ({ startedAtMs }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const strikeAt = startedAtMs + dischargeStrikeDelayMs();
    let raf = 0;
    let nextChangeAt = 0;
    let face = 1;
    const tick = () => {
      const now = Date.now();
      if (now >= nextChangeAt && ref.current) {
        face = ((face + Math.floor(Math.random() * 5)) % 6) + 1;
        ref.current.textContent = String(face);
        // Slows from ~16 to ~3 faces per second as the drum spins down.
        const left = Math.min(1, Math.max(0, strikeAt - now) / DRUM_SPINDOWN_MS);
        nextChangeAt = now + 60 + (1 - left) * 280;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAtMs]);
  return (
    <span
      ref={ref}
      className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-400 bg-black text-3xl font-black text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.6)]"
    >
      ?
    </span>
  );
};

/**
 * One focal overlay for the whole discharge: the capacitor charges up on the loser, the d6 roll
 * tumbles while the drum spins down, then a single compact result replaces it on the strike.
 */
export const DischargeSequenceBanner: React.FC<DischargeSequenceBannerProps> = ({
  targetNickname,
  isLocalTarget,
  roll,
  riskLevel,
  overloaded,
  resultingRiskLevel,
  startedAtMs,
  onSkip,
}) => {
  const { t } = useI18n();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const stage = useDischargeStage(startedAtMs, reducedMotion);
  const risk = clampRisk(riskLevel);
  const target = isLocalTarget ? t.verdict.you : targetNickname;
  const [chargeLeftMs] = useState(() =>
    Math.max(0, startedAtMs + DISCHARGE_CHARGE_MS - Date.now())
  );

  const frame =
    stage === 'strike'
      ? overloaded
        ? 'border-red-500 shadow-[0_0_48px_rgba(239,68,68,0.7)]'
        : 'border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.55)]'
      : 'border-amber-500/90 shadow-[0_0_36px_rgba(245,158,11,0.45)]';

  return (
    <>
      {stage === 'strike' && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          className={`fixed inset-0 z-30 pointer-events-none ${overloaded ? 'bg-red-500' : 'bg-sky-200'}`}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}
      <div className="fixed inset-x-0 top-[24%] -translate-y-1/2 z-40 flex justify-center px-4 pointer-events-none">
        <motion.div
          data-testid="discharge-sequence-banner"
          data-stage={stage}
          role="status"
          initial={reducedMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="w-[min(92vw,26rem)]"
        >
          <div
            onClick={onSkip}
            className={`flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl border-2 bg-black/90 font-mono text-center backdrop-blur-md pointer-events-auto cursor-pointer select-none transition-colors ${frame}`}
          >
            <span className="max-w-full truncate text-base sm:text-lg font-black tracking-wider uppercase text-white">
              ⚡ {target}
            </span>

            {stage === 'charge' && (
              <>
                <span className="text-[10px] font-black tracking-[0.35em] text-amber-400 animate-pulse">
                  {t.discharge.charging}
                </span>
                <ChamberRow risk={risk} roll={null} charging />
                <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: chargeLeftMs / 1000, ease: 'easeIn' }}
                  />
                </div>
                <span className="text-[11px] font-bold tracking-wider text-red-300">
                  {t.discharge.rule(risk)}
                </span>
              </>
            )}

            {stage === 'roll' && (
              <>
                <span className="text-[10px] font-black tracking-[0.35em] text-amber-400">
                  {t.discharge.rolling}
                </span>
                <TumblingDie startedAtMs={startedAtMs} />
                <span className="text-[11px] font-bold tracking-wider text-red-300">
                  {t.discharge.rule(risk)}
                </span>
              </>
            )}

            {stage === 'strike' && (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={reducedMotion ? false : { scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18 }
                }
              >
                <ChamberRow risk={risk} roll={roll} charging={false} />
                <span className="text-sm font-bold tracking-wider text-zinc-300">
                  {t.discharge.rolling}: <span className="text-white text-lg">{roll}</span>{' '}
                  {overloaded ? '≤' : '>'} {risk}
                </span>
                <span
                  data-testid="discharge-result"
                  className={`text-xl sm:text-2xl font-black tracking-widest ${
                    overloaded
                      ? 'text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]'
                      : 'text-sky-300 drop-shadow-[0_0_16px_rgba(56,189,248,0.9)]'
                  }`}
                >
                  {overloaded ? t.discharge.shorted : t.discharge.held}
                </span>
                {!overloaded && (
                  <span className="text-[11px] font-bold tracking-wider text-amber-300">
                    {t.discharge.riskNow(clampRisk(resultingRiskLevel))}
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};
