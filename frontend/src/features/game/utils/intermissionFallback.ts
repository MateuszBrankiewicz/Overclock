import type { PlayerSeat } from '../schemas/gameEvents';

export const HOST_GRACE_SECONDS = 6;

export type IntermissionFallback = 'none' | 'waitingForHost' | 'hostGone';

export interface IntermissionFallbackInput {
  countdown: number;
  graceElapsed: boolean;
  isHost: boolean;
  hostId: string | null;
  myPlayerId: string | null;
  players: PlayerSeat[];
}

export function isHostGone(hostId: string | null, players: PlayerSeat[]): boolean {
  if (!hostId) return true;
  const host = players.find((p) => p.playerId === hostId);
  return !host || host.status === 'Disconnected';
}

/**
 * What a client should show once the intermission countdown reaches zero.
 * The host starts the next round automatically; everyone else waits, and after a grace
 * period learns that the host is gone. Only the server-side host may start a round
 * (GameRoom.StartRound). The server re-assigns the host when it leaves or is eliminated,
 * which flips `isHost` on the new host's client; a merely disconnected host is not
 * re-assigned, so the remaining players can only wait or leave.
 */
export function getIntermissionFallback(input: IntermissionFallbackInput): IntermissionFallback {
  if (input.countdown > 0 || input.isHost) return 'none';
  if (!input.graceElapsed || !isHostGone(input.hostId, input.players)) return 'waitingForHost';
  return 'hostGone';
}
