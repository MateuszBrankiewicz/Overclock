import clsx from 'clsx';
import { ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { prefersReducedMotion } from '../../../../shared/lib/motion';
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
import {
  ChamberRow,
  OperatorChip,
  type PlateState,
  ShowdownCards,
  type ShowdownOperator,
  ShowdownStepper,
  TumblingDie,
} from './showdownParts';
import { type ShowdownTone, TONE, useReached } from './showdownTheme';

export type ShowdownStage = 'scan' | 'verdict' | 'decision' | 'charge' | 'roll' | 'strike';

/**
 * `bar` captions the 3D scene, which carries the cards, the drum and the roll.
 * `expanded` adds those to the 2D panel for clients without WebGL (`ArenaFallback`).
 */
export type ShowdownVariant = 'bar' | 'expanded';

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
  variant?: ShowdownVariant;
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
 * One slim caption bar for the whole bluff check, docked where the hand normally sits: who traces
 * whom, one line on what is happening, the tested player's decision and the step reached. The 3D
 * scene shows the cards, the drum and the roll; the bar only labels them.
 */
export const BluffShowdown: React.FC<BluffShowdownProps> = ({
  trace,
  revealStartedAtMs,
  discharge,
  target,
  decision,
  onSkip,
  variant = 'bar',
}) => {
  const { t } = useI18n();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const cardCount = trace?.cards.length ?? 0;

  const verdictAtMs =
    revealStartedAtMs !== null ? verdictVisibleAtMs(cardCount, revealStartedAtMs) : null;
  const rollAtMs = discharge ? discharge.startedAtMs + DISCHARGE_CHARGE_MS : null;
  const strikeAtMs = discharge
    ? discharge.startedAtMs + dischargeStrikeDelayMs(reducedMotion)
    : null;
  const verdictReached = useReached(verdictAtMs);
  const rollReached = useReached(rollAtMs);
  const strikeReached = useReached(strikeAtMs);

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

  const progress: { fromMs: number; toMs: number } | null =
    stage === 'scan' && revealStartedAtMs !== null && verdictAtMs !== null
      ? { fromMs: revealStartedAtMs, toMs: verdictAtMs }
      : stage === 'charge' && discharge && rollAtMs !== null
        ? { fromMs: discharge.startedAtMs, toMs: rollAtMs }
        : stage === 'roll' && rollAtMs !== null && strikeAtMs !== null
          ? { fromMs: rollAtMs, toMs: strikeAtMs }
          : null;

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

      {stage === 'verdict' && trace && <VerdictStamp trace={trace} reducedMotion={reducedMotion} />}

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-4 pointer-events-none">
        {variant === 'expanded' && (
          <ExpandedStage
            stage={stage}
            trace={trace}
            revealStartedAtMs={revealStartedAtMs}
            discharge={discharge}
            target={target}
          />
        )}

        <motion.div
          data-testid="bluff-showdown"
          data-stage={stage}
          data-variant={variant}
          role="status"
          initial={reducedMotion ? false : { y: 32 }}
          animate={{ y: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26 }
          }
          className="relative w-full max-w-[72rem]"
        >
          {onSkip && (
            <span className="absolute -top-[1.15rem] right-3 rounded-t-md bg-black/70 px-2 pt-0.5 text-[8px] font-bold tracking-[0.22em] text-zinc-400 sm:text-[9px]">
              {t.verdict.skipHint}
            </span>
          )}
          <div
            onClick={onSkip}
            className={clsx(
              'relative grid items-center gap-x-2 gap-y-1.5 overflow-hidden rounded-xl border-2 bg-zinc-950/90 px-2 pb-2 pt-2.5 font-mono backdrop-blur-md pointer-events-auto select-none transition-[border-color,box-shadow] duration-300 sm:gap-x-4 sm:px-3',
              'grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:"duel_step"_"desc_desc"]',
              'sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:[grid-template-areas:"duel_desc_step"]',
              TONE[tone].frame,
              onSkip && 'cursor-pointer'
            )}
          >
            <ProgressEdge
              key={`${stage}:${progress?.fromMs ?? 'none'}`}
              progress={progress}
              tone={tone}
              reducedMotion={reducedMotion}
            />

            <div className="min-w-0 [grid-area:duel]">
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
            </div>

            <div className="min-w-0 [grid-area:desc]">
              <CaptionLine
                stage={stage}
                trace={trace}
                discharge={discharge}
                target={target}
                decision={decision}
              />
            </div>

            <div className="flex justify-end [grid-area:step]">
              <ShowdownStepper
                current={STEP_OF[stage]}
                tone={tone}
                compact={stage === 'decision' && Boolean(decision && target?.isLocal)}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

/** Thin bar on the top edge that fills up towards the next beat. */
const ProgressEdge: React.FC<{
  progress: { fromMs: number; toMs: number } | null;
  tone: ShowdownTone;
  reducedMotion: boolean;
}> = ({ progress, tone, reducedMotion }) => {
  const [start] = useState(() => {
    if (!progress) return { done: 1, leftMs: 0 };
    const span = Math.max(1, progress.toMs - progress.fromMs);
    const done = Math.min(1, Math.max(0, (Date.now() - progress.fromMs) / span));
    return { done, leftMs: Math.max(0, progress.toMs - Date.now()) };
  });
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-zinc-800/80">
      <motion.div
        className={clsx('h-full', TONE[tone].bar)}
        initial={reducedMotion || !progress ? false : { width: `${start.done * 100}%` }}
        animate={{ width: '100%' }}
        transition={{
          duration: reducedMotion ? 0 : start.leftMs / 1000,
          ease: 'linear',
        }}
      />
    </div>
  );
};

/** One caption line for the current beat, plus the decision buttons for the tested player. */
const CaptionLine: React.FC<{
  stage: ShowdownStage;
  trace: ShowdownTrace | null;
  discharge: ShowdownDischarge | null;
  target: ShowdownOperator | null;
  decision: ShowdownDecision | null;
}> = ({ stage, trace, discharge, target, decision }) => {
  const { t } = useI18n();

  if (stage === 'scan' && trace) {
    return (
      <Caption
        main={
          <span className="text-amber-300 motion-safe:animate-pulse">{t.verdict.scanning}</span>
        }
        detail={
          <span style={{ color: PROTOCOL_HEX[trace.declaredProtocol] }}>
            {t.verdict.claim(trace.cards.length, trace.declaredProtocol)}
          </span>
        }
      />
    );
  }

  if (stage === 'verdict' && trace) {
    const loser = trace.bluffDetected ? trace.accused : trace.accuser;
    const bluffCount = trace.cards.filter(
      (c) => classifyCard(c.protocol, trace.declaredProtocol) === 'bluff'
    ).length;
    return (
      <Caption
        main={
          <span className={trace.bluffDetected ? 'text-red-300' : 'text-emerald-300'}>
            {trace.bluffDetected
              ? t.verdict.bluffReason(bluffCount, trace.cards.length, trace.declaredProtocol)
              : t.verdict.cleanReason(trace.declaredProtocol)}
          </span>
        }
        detail={
          <span
            data-testid="trace-verdict-subtitle"
            className={trace.bluffDetected ? 'text-red-200' : 'text-emerald-200'}
          >
            ⚡{' '}
            {loser.isLocal ? t.verdict.youVoltageTest : t.verdict.loserVoltageTest(loser.nickname)}
          </span>
        }
      />
    );
  }

  if (stage === 'decision') {
    return <DecisionCaption decision={decision} target={target} />;
  }

  if (!discharge) return null;
  const risk = clampRisk(discharge.riskLevel);

  if (stage === 'charge' || stage === 'roll') {
    return (
      <Caption
        main={
          <span className="text-amber-300">
            {stage === 'charge' ? t.discharge.charging : t.discharge.rolling}
          </span>
        }
        detail={<span className="text-red-300">{t.discharge.rule(risk)}</span>}
      />
    );
  }

  return (
    <Caption
      main={
        <span
          data-testid="discharge-result"
          className={clsx(
            discharge.overloaded
              ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]'
              : 'text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]'
          )}
        >
          {discharge.overloaded ? t.discharge.shorted : t.discharge.held}
        </span>
      }
      detail={
        <span className="text-zinc-300">
          {t.discharge.rolling}: <span className="text-white">{discharge.roll}</span>{' '}
          {discharge.overloaded ? '≤' : '>'} {risk}
          {!discharge.overloaded && (
            <span className="text-amber-300">
              {' '}
              · {t.discharge.riskNow(clampRisk(discharge.resultingRiskLevel))}
            </span>
          )}
        </span>
      }
    />
  );
};

const Caption: React.FC<{
  main: React.ReactNode;
  detail?: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ main, detail, aside }) => (
  <div className="flex min-w-0 items-center gap-2">
    <div className="flex min-w-0 flex-1 flex-col leading-tight sm:min-w-[9rem]">
      <span className="truncate text-[11px] font-black tracking-[0.14em] sm:text-sm">{main}</span>
      {detail && (
        <span className="truncate text-[10px] font-bold tracking-wide sm:text-xs">{detail}</span>
      )}
    </div>
    {aside}
  </div>
);

const DecisionCaption: React.FC<{
  decision: ShowdownDecision | null;
  target: ShowdownOperator | null;
}> = ({ decision, target }) => {
  const { t } = useI18n();
  const countdown = useCountdown(decision?.deadlineUtc ?? null);
  const risk = clampRisk(target?.riskLevel ?? 1);
  const isLocal = Boolean(decision && target?.isLocal);

  const buttons = isLocal && decision && (
    <div className="flex shrink-0 items-center gap-1.5">
      {decision.canUseGroundWire && decision.onDeployGroundWire && (
        <HudButton
          variant="primary"
          size="sm"
          onClick={decision.onDeployGroundWire}
          aria-label={t.voltage.useGroundWire}
          title={t.voltage.useGroundWire}
          className="shadow-[0_0_16px_rgba(16,185,129,0.6)]"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span>{t.verdict.groundWireShort}</span>
        </HudButton>
      )}
      {decision.onTriggerDischarge && (
        <HudButton
          variant="warning"
          size="sm"
          onClick={decision.onTriggerDischarge}
          aria-label={`${t.voltage.triggerDischarge} (D6)`}
          title={t.voltage.triggerDischarge}
          className="shadow-[0_0_20px_rgba(245,158,11,0.8)]"
        >
          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>{t.verdict.dischargeShort} (D6)</span>
        </HudButton>
      )}
    </div>
  );

  return (
    <Caption
      main={
        <span className="text-amber-300 motion-safe:animate-pulse">
          {!decision || !target
            ? t.verdict.awaiting
            : isLocal
              ? t.verdict.yourDecision
              : t.verdict.deciding(target.nickname)}
        </span>
      }
      detail={
        <span className="flex items-center gap-2">
          <span className="truncate text-red-300">{t.discharge.rule(risk)}</span>
          {countdown.isActive && (
            <span
              role="timer"
              aria-label={t.hud.dischargeTimer}
              data-testid="discharge-timer"
              className="flex min-w-[3.5rem] flex-1 items-center gap-1.5"
            >
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className={clsx(
                    'block h-full transition-[width] duration-200',
                    countdown.secondsLeft <= 2 ? 'bg-red-500' : 'bg-amber-400'
                  )}
                  style={{ width: `${Math.round(countdown.fraction * 100)}%` }}
                />
              </span>
              <span className="font-black tabular-nums text-zinc-200">
                {countdown.secondsLeft}
                {t.hud.secondsShort}
              </span>
            </span>
          )}
        </span>
      }
      aside={buttons}
    />
  );
};

/** Verdict stamp punched in above the bar; the 3D scene floods with the same colour. */
const VerdictStamp: React.FC<{
  trace: ShowdownTrace;
  reducedMotion: boolean;
}> = ({ trace, reducedMotion }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-x-0 bottom-[8.5rem] z-40 flex justify-center pointer-events-none sm:bottom-[7rem]">
      <motion.span
        data-testid="trace-verdict-title"
        initial={reducedMotion ? false : { opacity: 0, scale: 2.2, rotate: -14 }}
        animate={{ opacity: 1, scale: 1, rotate: -3 }}
        transition={
          reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 20 }
        }
        className={clsx(
          'rounded-lg border-[3px] border-double bg-black/75 px-4 py-1 font-mono text-2xl font-black tracking-widest whitespace-nowrap backdrop-blur-sm sm:text-4xl',
          trace.bluffDetected
            ? 'border-red-500 text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.85)]'
            : 'border-emerald-400 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.85)]'
        )}
      >
        {trace.bluffDetected ? t.verdict.bluffDetected : t.verdict.cleanTransmission}
      </motion.span>
    </div>
  );
};

/** No WebGL: the cards, the chambers and the d6 have no 3D scene to live in, so show them here. */
const ExpandedStage: React.FC<{
  stage: ShowdownStage;
  trace: ShowdownTrace | null;
  revealStartedAtMs: number | null;
  discharge: ShowdownDischarge | null;
  target: ShowdownOperator | null;
}> = ({ stage, trace, revealStartedAtMs, discharge, target }) => {
  const risk = clampRisk(discharge?.riskLevel ?? target?.riskLevel ?? 1);
  let body: React.ReactNode = null;
  if ((stage === 'scan' || stage === 'verdict') && trace && revealStartedAtMs !== null) {
    body = (
      <ShowdownCards
        cards={trace.cards}
        declaredProtocol={trace.declaredProtocol}
        startedAtMs={revealStartedAtMs}
      />
    );
  } else if (stage === 'roll' && discharge) {
    body = <TumblingDie startedAtMs={discharge.startedAtMs} />;
  } else if (stage !== 'scan' && stage !== 'verdict') {
    body = (
      <ChamberRow
        risk={risk}
        roll={stage === 'strike' && discharge ? discharge.roll : null}
        charging={stage === 'charge'}
      />
    );
  }
  if (!body) return null;
  return (
    <div
      data-testid="showdown-expanded"
      className="rounded-xl border border-zinc-700/80 bg-zinc-950/85 px-3 py-2 backdrop-blur-md"
    >
      {body}
    </div>
  );
};
