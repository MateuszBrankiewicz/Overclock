import { useEffect, useMemo, useState } from 'react';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import type { PlayerSeat } from '../../schemas/gameEvents';
import type { DischargeCinematic } from '../../stores/types';
import { dischargeStrikeDelayMs } from '../../utils/cinematicTiming';
import type { SeatLayout, Vec3 } from './useArenaSeats';
import { emitDischargeImpactSparks } from './vfx/vfxEmitter';

export interface ShockStateInput {
  dischargeCinematic: DischargeCinematic | null;
  myPlayerId: string | null;
  pendingDischargePlayerId: string | null;
  isEliminated: boolean;
  opponents: PlayerSeat[];
  seatLayouts: SeatLayout[];
}

/**
 * Timing of the discharge strike. The tested operator must look normal until the strike lands,
 * so every "shocked / eliminated / overloaded" flag is gated on `isShockActive`.
 */
export function useShockState({
  dischargeCinematic,
  myPlayerId,
  pendingDischargePlayerId,
  isEliminated,
  opponents,
  seatLayouts,
}: ShockStateInput) {
  const spindownDelayMs = dischargeStrikeDelayMs(prefersReducedMotion());
  const [isShockActive, setIsShockActive] = useState<boolean>(() => {
    if (!dischargeCinematic) return false;
    return Date.now() - dischargeCinematic.startedAtMs >= spindownDelayMs;
  });

  useEffect(() => {
    if (!dischargeCinematic) {
      const t = setTimeout(() => setIsShockActive(false), 0);
      return () => clearTimeout(t);
    }
    const elapsed = Date.now() - dischargeCinematic.startedAtMs;
    const remaining = spindownDelayMs - elapsed;
    if (remaining <= 0) {
      const t = setTimeout(() => setIsShockActive(true), 0);
      return () => clearTimeout(t);
    }
    const tReset = setTimeout(() => setIsShockActive(false), 0);
    const timer = setTimeout(() => {
      setIsShockActive(true);
    }, remaining);
    return () => {
      clearTimeout(tReset);
      clearTimeout(timer);
    };
  }, [dischargeCinematic, spindownDelayMs]);

  const effectiveShockStartTimeMs = useMemo(() => {
    if (!dischargeCinematic) return null;
    return dischargeCinematic.startedAtMs + spindownDelayMs;
  }, [dischargeCinematic, spindownDelayMs]);

  const isLocalShockTarget = Boolean(
    dischargeCinematic && dischargeCinematic.event.playerId === myPlayerId
  );
  /**
   * The server marks the loser Eliminated as soon as the discharge resolves, but on screen they
   * must look alive until the current actually hits them (or until the discharge arrives at all).
   */
  const strikePendingPlayerId = dischargeCinematic
    ? isShockActive
      ? null
      : dischargeCinematic.event.playerId
    : pendingDischargePlayerId;
  const isLocalEliminatedShown = isEliminated && strikePendingPlayerId !== myPlayerId;
  const isLocalOverloaded = Boolean(isLocalShockTarget && dischargeCinematic?.event.overloaded);

  const shockTargetInfo = useMemo(() => {
    if (!dischargeCinematic || !isShockActive) return { pos: null, isOverloaded: false };
    const targetPlayerId = dischargeCinematic.event.playerId;
    const isOverloaded = dischargeCinematic.event.overloaded;

    if (targetPlayerId === myPlayerId) {
      return { pos: [0, 1.25, 2.05] as Vec3, isOverloaded };
    }
    const oppIdx = opponents.findIndex((o) => o.playerId === targetPlayerId);
    if (oppIdx >= 0 && seatLayouts[oppIdx]) {
      const p = seatLayouts[oppIdx].position;
      return { pos: [p[0], p[1] + 1.15, p[2] + 0.2] as Vec3, isOverloaded };
    }
    return { pos: [0, 1.1, -2.2] as Vec3, isOverloaded };
  }, [dischargeCinematic, isShockActive, myPlayerId, opponents, seatLayouts]);

  useEffect(() => {
    if (isShockActive && shockTargetInfo.pos) {
      emitDischargeImpactSparks(shockTargetInfo.pos, shockTargetInfo.isOverloaded);
    }
  }, [isShockActive, shockTargetInfo.pos, shockTargetInfo.isOverloaded]);

  const isOpponentShock = Boolean(
    dischargeCinematic && isShockActive && dischargeCinematic.event.playerId !== myPlayerId
  );

  return {
    isShockActive,
    effectiveShockStartTimeMs,
    strikePendingPlayerId,
    isLocalEliminatedShown,
    isLocalOverloaded,
    isOpponentShock,
  };
}
