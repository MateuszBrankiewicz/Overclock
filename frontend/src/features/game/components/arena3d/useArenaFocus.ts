import { useMemo } from 'react';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import type {
  CardsPlayedEvent,
  PlayerCard,
  PlayerSeat,
  RoomState,
} from '../../schemas/gameEvents';
import type { DischargeCinematic } from '../../stores/types';
import { verdictVisibleAtMs } from '../../utils/cinematicTiming';
import { revealCardsSettledAtMs } from './revealCardPose';
import type { SeatLayout, Vec3 } from './useArenaSeats';
import { useReachedAt } from './useReachedAt';
import { resolveCableTargetId } from './vfx/shockCables';

export interface ArenaFocusInput {
  players: PlayerSeat[];
  opponents: PlayerSeat[];
  seatLayouts: SeatLayout[];
  seatHeadPos: (playerId: string) => Vec3;
  seatChestPos: (playerId: string) => Vec3;
  myPlayerId: string | null;
  activePlayerId: string | null;
  pendingDischargePlayerId: string | null;
  roomState: RoomState | null;
  isEliminated: boolean;
  spectatorTargetPlayerId: string | null;
  lastPlayedCards: CardsPlayedEvent | null;
  dischargeCinematic: DischargeCinematic | null;
  revealedCards: PlayerCard[] | null;
  revealStartedAtMs: number | null;
  revealLoserPlayerId: string | null;
  voltageTargetPlayerId: string | null;
  revealAccuserPlayerId: string | null;
  revealAccusedPlayerId: string | null;
}

/**
 * Where the camera looks and where reveal/voltage effects aim. Until the cards are face-up
 * nothing may hint at the loser (camera, lightning).
 */
export function useArenaFocus({
  players,
  opponents,
  seatLayouts,
  seatHeadPos,
  seatChestPos,
  myPlayerId,
  activePlayerId,
  pendingDischargePlayerId,
  roomState,
  isEliminated,
  spectatorTargetPlayerId,
  lastPlayedCards,
  dischargeCinematic,
  revealedCards,
  revealStartedAtMs,
  revealLoserPlayerId,
  voltageTargetPlayerId,
  revealAccuserPlayerId,
  revealAccusedPlayerId,
}: ArenaFocusInput) {
  const lastPlaySeatPosition = useMemo<Vec3 | null>(() => {
    if (!lastPlayedCards) return null;
    if (lastPlayedCards.playerId === myPlayerId) {
      return [0, 1.15, 2.02];
    }
    const oppIdx = opponents.findIndex((o) => o.playerId === lastPlayedCards.playerId);
    if (oppIdx >= 0 && seatLayouts[oppIdx]) {
      return seatLayouts[oppIdx].position;
    }
    return [0, 1.1, -2.4];
  }, [lastPlayedCards, myPlayerId, opponents, seatLayouts]);

  const revealVerdictAtMs =
    revealStartedAtMs !== null && revealedCards && revealedCards.length > 0
      ? verdictVisibleAtMs(revealedCards.length, revealStartedAtMs)
      : null;
  const isVerdictReached = useReachedAt(revealVerdictAtMs);

  const revealLoserPos = useMemo<Vec3 | null>(() => {
    if (!revealLoserPlayerId || !isVerdictReached) return null;
    return seatHeadPos(revealLoserPlayerId);
  }, [revealLoserPlayerId, isVerdictReached, seatHeadPos]);

  // Leads clamp on the loser only once the last reveal card has stopped turning, and stay on while
  // the table waits for the discharge and through it.
  const revealCardsSettledAt =
    revealStartedAtMs !== null && revealedCards && revealedCards.length > 0
      ? revealCardsSettledAtMs(revealedCards.length, revealStartedAtMs, prefersReducedMotion())
      : null;
  const areRevealCardsSettled = useReachedAt(revealCardsSettledAt);
  const cableTargetId = resolveCableTargetId({
    dischargePlayerId: dischargeCinematic?.event.playerId ?? null,
    voltageTargetPlayerId: voltageTargetPlayerId ?? pendingDischargePlayerId,
    isRevealOnScreen: revealCardsSettledAt !== null,
    areRevealCardsSettled,
  });
  const cableTargetPos = useMemo(
    () => (cableTargetId ? seatChestPos(cableTargetId) : null),
    [cableTargetId, seatChestPos]
  );

  const traceDuel = useMemo(() => {
    if (revealVerdictAtMs === null || isVerdictReached) return null;
    if (!revealAccuserPlayerId || !revealAccusedPlayerId) return null;
    const from = seatHeadPos(revealAccuserPlayerId);
    const to = seatHeadPos(revealAccusedPlayerId);
    // The local seat sits right under the camera: start the beam lower, in front of the player.
    if (revealAccuserPlayerId === myPlayerId) {
      from[1] = 1.05;
      from[2] = 1.45;
    }
    return { from, to, accusedIsLocal: revealAccusedPlayerId === myPlayerId };
  }, [
    revealVerdictAtMs,
    isVerdictReached,
    revealAccuserPlayerId,
    revealAccusedPlayerId,
    seatHeadPos,
    myPlayerId,
  ]);

  const subjectInfo = useMemo<{ pos: Vec3 | null; isLocal: boolean }>(() => {
    const seatSubject = (playerId: string) => {
      if (playerId === myPlayerId) return { pos: [0, 1.25, 2.05] as Vec3, isLocal: true };
      const oppIdx = opponents.findIndex((o) => o.playerId === playerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
      return null;
    };
    if (revealLoserPos) {
      return { pos: revealLoserPos, isLocal: revealLoserPlayerId === myPlayerId };
    }
    if (traceDuel) {
      return { pos: traceDuel.to, isLocal: traceDuel.accusedIsLocal };
    }
    if (dischargeCinematic) {
      const subject = seatSubject(dischargeCinematic.event.playerId);
      if (subject) return subject;
    }
    if (pendingDischargePlayerId) {
      const subject = seatSubject(pendingDischargePlayerId);
      if (subject) return subject;
    }
    if (roomState === 'GameOver') {
      const winner = players.find((p) => p.status === 'Active');
      if (winner) {
        const subject = seatSubject(winner.playerId);
        if (subject) return subject;
      }
    }
    if (isEliminated && spectatorTargetPlayerId) {
      const oppIdx = opponents.findIndex((o) => o.playerId === spectatorTargetPlayerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
    }
    if (roomState === 'TurnActive' && activePlayerId) {
      const subject = seatSubject(activePlayerId);
      if (subject) return subject;
    }
    return { pos: null, isLocal: false };
  }, [
    revealLoserPos,
    revealLoserPlayerId,
    traceDuel,
    myPlayerId,
    dischargeCinematic,
    pendingDischargePlayerId,
    roomState,
    players,
    activePlayerId,
    opponents,
    seatLayouts,
    isEliminated,
    spectatorTargetPlayerId,
  ]);

  return { lastPlaySeatPosition, revealVerdictAtMs, cableTargetPos, traceDuel, subjectInfo };
}
