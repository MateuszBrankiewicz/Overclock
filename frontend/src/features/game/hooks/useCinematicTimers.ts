import { useEffect } from 'react';

import { prefersReducedMotion } from '../../../shared/lib/motion';
import { useGameStore } from '../stores/useGameStore';
import {
  AWAIT_DISCHARGE_TIMEOUT_MS,
  dischargeCinematicDurationMs,
  traceRevealDurationMs,
} from '../utils/cinematicTiming';

/**
 * Presentation timers and skip handling for the showdown sequence:
 * card reveal -> discharge on the operator -> next-round countdown.
 */
export function useCinematicTimers(): void {
  const traceReveal = useGameStore((s) => s.traceReveal);
  const finishTraceReveal = useGameStore((s) => s.finishTraceReveal);
  const roundIntro = useGameStore((s) => s.roundIntro);
  const clearRoundIntro = useGameStore((s) => s.clearRoundIntro);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const clearDischargeCinematic = useGameStore((s) => s.clearDischargeCinematic);
  const awaitingDischargeForSequence = useGameStore((s) => s.awaitingDischargeForSequence);
  const clearAwaitingDischarge = useGameStore((s) => s.clearAwaitingDischarge);

  // Presentation order after a trace: card reveal -> discharge on the operator -> next-round countdown.
  useEffect(() => {
    if (!traceReveal) return;
    const remaining =
      traceRevealDurationMs(traceReveal.resolution.revealedCards.length) -
      (Date.now() - traceReveal.startedAtMs);
    const timer = setTimeout(finishTraceReveal, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [traceReveal, finishTraceReveal]);

  // Auto-dismiss discharge cinematic using exact duration (including death kinematic)
  useEffect(() => {
    if (!dischargeCinematic) return;
    const duration = dischargeCinematicDurationMs(
      dischargeCinematic.event.overloaded,
      prefersReducedMotion()
    );
    const remaining = duration - (Date.now() - dischargeCinematic.startedAtMs);
    const timer = setTimeout(clearDischargeCinematic, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [dischargeCinematic, clearDischargeCinematic]);

  // Safety watchdog: clear awaitingDischarge if network or server drops discharge event
  useEffect(() => {
    if (awaitingDischargeForSequence === null) return;
    const timer = setTimeout(clearAwaitingDischarge, AWAIT_DISCHARGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [awaitingDischargeForSequence, clearAwaitingDischarge]);

  // Space key skip for trace reveal & discharge cinematics (UX-06)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (traceReveal) {
          e.preventDefault();
          finishTraceReveal();
        } else if (dischargeCinematic) {
          e.preventDefault();
          clearDischargeCinematic();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [traceReveal, finishTraceReveal, dischargeCinematic, clearDischargeCinematic]);

  // For rounds > 1, the upcoming round is announced in RoundIntermissionBanner
  useEffect(() => {
    if (roundIntro && roundIntro.roundNumber > 1) {
      clearRoundIntro();
    }
  }, [roundIntro, clearRoundIntro]);
}
