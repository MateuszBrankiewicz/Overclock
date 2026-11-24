import type { PlayerSeat } from '../../../schemas/gameEvents';

/**
 * Last-holder rule (mirrors `GameRoom.PlayCards` → `Turn.MustCallTrace`): once every rival has
 * emptied their hand, nobody could challenge another play, so the last player still holding
 * cards may only call TRACE on the previous play.
 */
export function mustCallTrace(
  players: readonly PlayerSeat[],
  myPlayerId: string | null,
  lastPlayerId: string | null | undefined,
  tablePileCount: number,
): boolean {
  if (!myPlayerId || tablePileCount <= 0 || !lastPlayerId || lastPlayerId === myPlayerId) {
    return false;
  }
  return players.every(
    (p) => p.playerId === myPlayerId || p.status === 'Eliminated' || p.handCount === 0,
  );
}
