import type { CardProtocol } from '../../../schemas/gameEvents';

export type CardMark = 'match' | 'wild' | 'bluff';

/**
 * Classifies a hand card against the required protocol (game rules §2):
 * Glitch is always wild, Corrupted is always a bluff, base protocols match only
 * their own protocol. With no required protocol yet, base cards are free to declare.
 */
export function classifyCard(protocol: CardProtocol, target: CardProtocol | null): CardMark {
  if (protocol === 'Glitch') return 'wild';
  if (protocol === 'Corrupted') return 'bluff';
  if (target === null) return 'match';
  return protocol === target ? 'match' : 'bluff';
}

export const MARK_COLOR: Record<CardMark, string> = {
  match: '#10b981',
  wild: '#e879f9',
  bluff: '#f59e0b',
};
