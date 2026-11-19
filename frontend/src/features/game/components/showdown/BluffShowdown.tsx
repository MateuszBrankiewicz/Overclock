import clsx from 'clsx';
import { motion } from 'motion/react';
import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import { CaptionLine } from './CaptionLine';
import { ExpandedStage } from './ExpandedStage';
import { ProgressEdge } from './ProgressEdge';
import { ShowdownDuel } from './ShowdownDuel';
import { ShowdownStepper } from './showdownParts';
import { TONE } from './showdownTheme';
import { type BluffShowdownProps, STEP_OF } from './showdownTypes';
import { useShowdownSequence } from './useShowdownSequence';
import { VerdictStamp } from './VerdictStamp';

export type {
  BluffShowdownProps,
  ShowdownDecision,
  ShowdownDischarge,
  ShowdownStage,
  ShowdownTrace,
  ShowdownVariant,
} from './showdownTypes';

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
  const { reducedMotion, stage, tone, plateState, progress } =
    useShowdownSequence(trace, revealStartedAtMs, discharge);

  return (
    <>
      {stage === 'strike' && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          className={clsx(
            'fixed inset-0 z-30 pointer-events-none',
            discharge?.overloaded ? 'bg-red-500' : 'bg-sky-200',
          )}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}

      {stage === 'verdict' && trace && (
        <VerdictStamp trace={trace} reducedMotion={reducedMotion} />
      )}

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
            reducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 26 }
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
              onSkip && 'cursor-pointer',
            )}
          >
            <ProgressEdge
              key={`${stage}:${progress?.fromMs ?? 'none'}`}
              progress={progress}
              tone={tone}
              reducedMotion={reducedMotion}
            />

            <div className="min-w-0 [grid-area:duel]">
              <ShowdownDuel
                trace={trace}
                target={target}
                tone={tone}
                plateState={plateState}
              />
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
                compact={
                  stage === 'decision' && Boolean(decision && target?.isLocal)
                }
              />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
