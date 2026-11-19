import { useMemo } from 'react';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import {
  DISCHARGE_CHARGE_MS,
  dischargeStrikeDelayMs,
  verdictVisibleAtMs,
} from '../../utils/cinematicTiming';
import type { PlateState } from './showdownParts';
import { type ShowdownTone, useReached } from './showdownTheme';
import type {
  ShowdownDischarge,
  ShowdownStage,
  ShowdownTrace,
} from './showdownTypes';

export interface ShowdownProgress {
  fromMs: number;
  toMs: number;
}

/**
 * Phase progression of the bluff check: which beat is on screen, the panel tone, the progress
 * window towards the next beat and the plate state of each duelist.
 */
export function useShowdownSequence(
  trace: ShowdownTrace | null,
  revealStartedAtMs: number | null,
  discharge: ShowdownDischarge | null,
) {
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const cardCount = trace?.cards.length ?? 0;

  const verdictAtMs =
    revealStartedAtMs !== null
      ? verdictVisibleAtMs(cardCount, revealStartedAtMs)
      : null;
  const rollAtMs = discharge
    ? discharge.startedAtMs + DISCHARGE_CHARGE_MS
    : null;
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
    !verdictKnown
      ? 'neutral'
      : trace.bluffDetected === isAccused
        ? 'tested'
        : 'safe';

  const progress: ShowdownProgress | null =
    stage === 'scan' && revealStartedAtMs !== null && verdictAtMs !== null
      ? { fromMs: revealStartedAtMs, toMs: verdictAtMs }
      : stage === 'charge' && discharge && rollAtMs !== null
        ? { fromMs: discharge.startedAtMs, toMs: rollAtMs }
        : stage === 'roll' && rollAtMs !== null && strikeAtMs !== null
          ? { fromMs: rollAtMs, toMs: strikeAtMs }
          : null;

  return { reducedMotion, stage, tone, plateState, progress };
}
