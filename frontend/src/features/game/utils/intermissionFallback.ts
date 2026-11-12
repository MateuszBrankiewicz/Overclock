import type { PlayerSeat } from '../schemas/gameEvents';

export const HOST_GRACE_SECONDS = 6;

export type IntermissionFallback = 'none' | 'waitingForHost' | 'hostGone' | 'promoted';

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

/** First connected, non-eliminated seat: who should drive the table when the host is gone. */
export function effectiveHostId(players: PlayerSeat[]): string | null {
  return players.find((p) => p.status === 'Active')?.playerId ?? null;
}

/**
 * What a client should show once the intermission countdown reaches zero.
 * The host starts the next round automatically; everyone else waits, and after a grace
 * period learns that the host is gone (the new effective host gets a manual start button).
 */
export function getIntermissionFallback(input: IntermissionFallbackInput): IntermissionFallback {
  if (input.countdown > 0 || input.isHost) return 'none';
  if (!input.graceElapsed || !isHostGone(input.hostId, input.players)) return 'waitingForHost';
  return effectiveHostId(input.players) === input.myPlayerId ? 'promoted' : 'hostGone';
}
