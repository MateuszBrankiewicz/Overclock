import clsx from 'clsx';
import { ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../../shared/theme/protocols';
import { HudButton } from '../../../../shared/ui';
import { useCountdown } from '../../hooks/useCountdown';
import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import {
  DISCHARGE_CHARGE_MS,
  dischargeStrikeDelayMs,
  verdictVisibleAtMs,
} from '../../utils/cinematicTiming';
import { classifyCard } from '../arena3d/hud/cardMarks';
import { prefersReducedMotion } from '../arena3d/hud/motion';
import {
  ChamberRow,
  OperatorPlate,
  type PlateState,
  ShowdownCards,
  type ShowdownOperator,
  ShowdownStepper,
  TumblingDie,
} from './showdownParts';
import { type ShowdownTone, TONE, useReached } from './showdownTheme';

export type ShowdownStage = 'scan' | 'verdict' | 'decision' | 'charge' | 'roll' | 'strike';

export interface ShowdownTrace {
  accuser: ShowdownOperator;
  accused: ShowdownOperator;
  declaredProtocol: CardProtocol;
  cards: PlayerCard[];
  bluffDetected: boolean;
}

export interface ShowdownDischarge {
  startedAtMs: number;
  roll: number;
  riskLevel: number;
  overloaded: boolean;
  resultingRiskLevel: number;
}

export interface ShowdownDecision {
  deadlineUtc: string | null;
  canUseGroundWire: boolean;
  onDeployGroundWire?: () => void;
  onTriggerDischarge?: () => void;
}

export interface BluffShowdownProps {
  /** The trace being settled; null when a voltage test runs without one. */
  trace: ShowdownTrace | null;
  /** Set while the contested cards are being revealed. */
  revealStartedAtMs: number | null;
  /** Set while the discharge roll is playing. */
  discharge: ShowdownDischarge | null;
  /** Operator under the voltage test. */
  target: ShowdownOperator | null;
  /** Set while the tested operator still has to decide. */
  decision: ShowdownDecision | null;
  onSkip?: () => void;
}

const clampRisk = (risk: number) => Math.max(1, Math.min(6, risk));

const STEP_OF: Record<ShowdownStage, number> = {
  scan: 0,
  verdict: 1,
  decision: 2,
  charge: 2,
  roll: 3,
  strike: 3,
};

/**
 * One console for the whole bluff check, docked where the hand normally sits: who traces whom,
 * the cards flipping, the verdict, the voltage test decision and the discharge roll. Every beat
 * replaces the body of the same panel, so the table never fills up with unrelated banners.
 */
export const BluffShowdown: React.FC<BluffShowdownProps> = ({
  trace,
  revealStartedAtMs,
  discharge,
  target,
  decision,
  onSkip,
}) => {
  const { t } = useI18n();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const cardCount = trace?.cards.length ?? 0;

  const verdictReached = useReached(
    revealStartedAtMs !== null ? verdictVisibleAtMs(cardCount, revealStartedAtMs) : null
  );
  const rollReached = useReached(discharge ? discharge.startedAtMs + DISCHARGE_CHARGE_MS : null);
  const strikeReached = useReached(
    discharge ? discharge.startedAtMs + dischargeStrikeDelayMs(reducedMotion) : null
  );

  const isReveal = revealStartedAtMs !== null && trace !== null;
  const stage: ShowdownStage = isReveal
    ? verdictReached
      ? 'verdict'
      : 'scan'
    : discharge
      ? strikeReached
        ? 'strike'
        : rollReached
          ? 'roll'
          : 'charge'
      : 'decision';

  const tone: ShowdownTone =
    stage === 'verdict'
      ? trace?.bluffDetected
        ? 'red'
        : 'emerald'
      : stage === 'strike'
        ? discharge?.overloaded
          ? 'red'
          : 'sky'
        : 'amber';

  // Nothing may hint at the loser while the cards are still face-down.
  const verdictKnown = trace !== null && stage !== 'scan';
  const plateState = (isAccused: boolean): PlateState =>
    !verdictKnown ? 'neutral' : trace.bluffDetected === isAccused ? 'tested' : 'safe';

  return (
    <>
      {stage === 'strike' && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          className={clsx(
            'fixed inset-0 z-30 pointer-events-none',
            discharge?.overloaded ? 'bg-red-500' : 'bg-sky-200'
          )}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-5 pointer-events-none">
        <motion.div
          data-testid="bluff-showdown"
          data-stage={stage}
          role="status"
          initial={reducedMotion ? false : { opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
          className="w-full max-w-[46rem]"
        >
          <div
            onClick={onSkip}
            className={clsx(
              'relative overflow-hidden rounded-2xl border-2 bg-zinc-950/90 font-mono backdrop-blur-md pointer-events-auto select-none transition-[border-color,box-shadow] duration-300',
              TONE[tone].frame,
              onSkip && 'cursor-pointer'
            )}
          >
            <div aria-hidden="true" className={clsx('h-0.5 w-full transition-colors duration-300', TONE[tone].bar)} />

            <header className="flex items-center justify-between gap-2 border-b border-zinc-800/80 bg-black/50 px-3 py-1.5">
              <span
                className={clsx(
                  'truncate text-[10px] sm:text-[11px] font-black tracking-[0.3em]',
                  TONE[tone].text
                )}
              >
                {trace ? t.verdict.showdownTitle : t.verdict.voltageTitle}
              </span>
              <ShowdownStepper current={STEP_OF[stage]} tone={tone} />
            </header>

            <div className="flex flex-col gap-2 px-2.5 py-2.5 sm:px-4 sm:py-3">
              {trace ? (
                <div data-testid="trace-duel-line" className="flex items-stretch gap-1.5 sm:gap-2.5">
                  <OperatorPlate
                    operator={trace.accuser}
                    role={t.verdict.traces}
                    state={plateState(false)}
                    tone={tone}
                  />
                  <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-0.5">
                    <span aria-hidden="true" className={clsx('text-base leading-none', TONE[tone].text)}>
                      ⟶
                    </span>
                    <span
                      className="rounded border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wider whitespace-nowrap"
                      style={{
                        color: PROTOCOL_HEX[trace.declaredProtocol],
                        borderColor: PROTOCOL_HEX[trace.declaredProtocol],
                      }}
                    >
                      {cardCount}× {trace.declaredProtocol.toUpperCase()}
                    </span>
                  </div>
                  <OperatorPlate
                    operator={trace.accused}
                    role={t.verdict.roleAccused}
                    state={plateState(true)}
                    tone={tone}
                    mirrored
                  />
                </div>
              ) : (
                target && (
                  <div className="flex justify-center">
                    <div className="flex w-full max-w-xs">
                      <OperatorPlate
                        operator={target}
                        role={t.verdict.voltageTitle}
                        state="neutral"
                        tone={tone}
                      />
                    </div>
                  </div>
                )
              )}

              <div className="flex min-h-[6.5rem] sm:min-h-[7rem] items-center justify-center">
                {isReveal ? (
                  <RevealBody
                    trace={trace}
                    startedAtMs={revealStartedAtMs}
                    verdictReached={verdictReached}
                    reducedMotion={reducedMotion}
                  />
                ) : discharge ? (
                  <DischargeBody discharge={discharge} stage={stage} reducedMotion={reducedMotion} />
                ) : (
                  <DecisionBody decision={decision} target={target} />
                )}
              </div>
            </div>

            {onSkip && (
              <div className="border-t border-zinc-800/80 bg-black/50 px-3 py-1 text-center text-[9px] font-bold tracking-[0.25em] text-zinc-500">
                {t.verdict.skipHint}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

const RevealBody: React.FC<{
  trace: ShowdownTrace;
  startedAtMs: number;
  verdictReached: boolean;
  reducedMotion: boolean;
}> = ({ trace, startedAtMs, verdictReached, reducedMotion }) => {
  const { t } = useI18n();
  const [scanMs] = useState(() =>
    Math.max(0, verdictVisibleAtMs(trace.cards.length, startedAtMs) - Date.now())
  );
  const loser = trace.bluffDetected ? trace.accused : trace.accuser;
  const bluffCount = trace.cards.filter(
    (c) => classifyCard(c.protocol, trace.declaredProtocol) === 'bluff'
  ).length;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-6">
      <ShowdownCards
        cards={trace.cards}
        declaredProtocol={trace.declaredProtocol}
        startedAtMs={startedAtMs}
      />

      {!verdictReached ? (
        <div data-testid="trace-duel-banner" className="flex w-full max-w-[15rem] flex-col gap-1.5 text-center sm:text-left">
          <span
            className="text-[11px] sm:text-xs font-bold tracking-wider"
            style={{ color: PROTOCOL_HEX[trace.declaredProtocol] }}
          >
            {t.verdict.claim(trace.cards.length, trace.declaredProtocol)}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: scanMs / 1000, ease: 'easeIn' }}
            />
          </div>
          <span className="text-[9px] font-bold tracking-[0.3em] text-zinc-400 motion-safe:animate-pulse">
            {t.verdict.scanning}
          </span>
        </div>
      ) : (
        <div data-testid="trace-verdict-banner" className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <motion.span
            data-testid="trace-verdict-title"
            initial={reducedMotion ? false : { opacity: 0, scale: 2.2, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 20 }}
            className={clsx(
              'rounded-lg border-[3px] border-double px-3 py-0.5 text-xl sm:text-2xl font-black tracking-widest whitespace-nowrap',
              trace.bluffDetected
                ? 'border-red-500 text-red-400 drop-shadow-[0_0_14px_rgba(239,68,68,0.8)]'
                : 'border-emerald-400 text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.8)]'
            )}
          >
            {trace.bluffDetected ? t.verdict.bluffDetected : t.verdict.cleanTransmission}
          </motion.span>
          <span className="mt-1 text-[11px] sm:text-xs font-bold tracking-wide text-zinc-300">
            {trace.bluffDetected
              ? t.verdict.bluffReason(bluffCount, trace.cards.length, trace.declaredProtocol)
              : t.verdict.cleanReason(trace.declaredProtocol)}
          </span>
          <span
            data-testid="trace-verdict-subtitle"
            className={clsx(
              'text-xs sm:text-sm font-black tracking-wider',
              trace.bluffDetected ? 'text-red-200' : 'text-emerald-200'
            )}
          >
            ⚡ {loser.isLocal ? t.verdict.youVoltageTest : t.verdict.loserVoltageTest(loser.nickname)}
          </span>
        </div>
      )}
    </div>
  );
};

const DecisionBody: React.FC<{
  decision: ShowdownDecision | null;
  target: ShowdownOperator | null;
}> = ({ decision, target }) => {
  const { t } = useI18n();
  const countdown = useCountdown(decision?.deadlineUtc ?? null);
  const risk = clampRisk(target?.riskLevel ?? 1);
  const isLocal = Boolean(decision && target?.isLocal);

  return (
    <div data-testid="showdown-decision" className="flex w-full flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <ChamberRow risk={risk} roll={null} charging={false} />
        <span className="text-[11px] font-bold tracking-wider text-red-300">
          {t.discharge.rule(risk)}
        </span>
      </div>

      <div className="flex w-full max-w-[19rem] flex-col items-center gap-1.5 sm:items-stretch">
        <span className="text-center text-[11px] sm:text-xs font-black tracking-[0.2em] text-amber-300 motion-safe:animate-pulse">
          {!decision || !target
            ? t.verdict.awaiting
            : isLocal
              ? t.verdict.yourDecision
              : t.verdict.deciding(target.nickname)}
        </span>
        {countdown.isActive && (
          <div
            role="timer"
            aria-label={t.hud.dischargeTimer}
            data-testid="discharge-timer"
            className="flex w-full items-center gap-2"
          >
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={clsx(
                  'h-full transition-[width] duration-200',
                  countdown.secondsLeft <= 2 ? 'bg-red-500' : 'bg-amber-400'
                )}
                style={{ width: `${Math.round(countdown.fraction * 100)}%` }}
              />
            </div>
            <span className="w-6 text-right text-[11px] font-black tabular-nums text-zinc-200">
              {countdown.secondsLeft}
              {t.hud.secondsShort}
            </span>
          </div>
        )}
        {isLocal && decision && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {decision.canUseGroundWire && decision.onDeployGroundWire && (
              <HudButton
                variant="primary"
                size="md"
                onClick={decision.onDeployGroundWire}
                className="shadow-[0_0_20px_rgba(16,185,129,0.6)]"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-300" />
                <span>{t.voltage.useGroundWire}</span>
              </HudButton>
            )}
            {decision.onTriggerDischarge && (
              <HudButton
                variant="warning"
                size="md"
                onClick={decision.onTriggerDischarge}
                className="shadow-[0_0_25px_rgba(245,158,11,0.8)]"
              >
                <Zap className="w-4 h-4 shrink-0 text-amber-300" />
                <span>{t.voltage.triggerDischarge} (D6)</span>
              </HudButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DischargeBody: React.FC<{
  discharge: ShowdownDischarge;
  stage: ShowdownStage;
  reducedMotion: boolean;
}> = ({ discharge, stage, reducedMotion }) => {
  const { t } = useI18n();
  const risk = clampRisk(discharge.riskLevel);
  const [chargeLeftMs] = useState(() =>
    Math.max(0, discharge.startedAtMs + DISCHARGE_CHARGE_MS - Date.now())
  );

  if (stage === 'charge') {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <span className="text-[10px] font-black tracking-[0.35em] text-amber-400 motion-safe:animate-pulse">
          {t.discharge.charging}
        </span>
        <ChamberRow risk={risk} roll={null} charging />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
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
      </div>
    );
  }

  if (stage === 'roll') {
    return (
      <div className="flex items-center justify-center gap-4">
        <TumblingDie startedAtMs={discharge.startedAtMs} />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black tracking-[0.35em] text-amber-400">
            {t.discharge.rolling}
          </span>
          <span className="text-[11px] font-bold tracking-wider text-red-300">
            {t.discharge.rule(risk)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      initial={reducedMotion ? false : { scale: 1.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18 }}
    >
      <ChamberRow risk={risk} roll={discharge.roll} charging={false} />
      <span className="text-sm font-bold tracking-wider text-zinc-300">
        {t.discharge.rolling}: <span className="text-lg text-white">{discharge.roll}</span>{' '}
        {discharge.overloaded ? '≤' : '>'} {risk}
      </span>
      <span
        data-testid="discharge-result"
        className={clsx(
          'text-xl sm:text-2xl font-black tracking-widest',
          discharge.overloaded
            ? 'text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]'
            : 'text-sky-300 drop-shadow-[0_0_16px_rgba(56,189,248,0.9)]'
        )}
      >
        {discharge.overloaded ? t.discharge.shorted : t.discharge.held}
      </span>
      {!discharge.overloaded && (
        <span className="text-[11px] font-bold tracking-wider text-amber-300">
          {t.discharge.riskNow(clampRisk(discharge.resultingRiskLevel))}
        </span>
      )}
    </motion.div>
  );
};
