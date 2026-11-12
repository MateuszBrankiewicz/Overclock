import type { PlayerSeat } from '../schemas/gameEvents';

export interface PodiumEntry {
  playerId: string;
  nickname: string;
  placement: number;
  isWinner: boolean;
}

/**
 * Final standings: winner first, then eliminated players by recorded placement (1 = best).
 * Players without a recorded placement are ranked after the known ones, keeping seat order.
 */
export function buildPodium(
  players: PlayerSeat[],
  placementByPlayerId: Record<string, number>,
  winnerId: string | null
): PodiumEntry[] {
  const rank = (p: PlayerSeat): number => {
    if (p.playerId === winnerId) return 0;
    return placementByPlayerId[p.playerId] ?? Number.MAX_SAFE_INTEGER;
  };
  const sorted = players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => rank(a.player) - rank(b.player) || a.index - b.index);
  return sorted.map(({ player }, i) => ({
    playerId: player.playerId,
    nickname: player.nickname,
    placement: i + 1,
    isWinner: player.playerId === winnerId,
  }));
}
