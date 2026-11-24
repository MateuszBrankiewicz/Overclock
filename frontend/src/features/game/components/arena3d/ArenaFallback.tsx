import React from 'react';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import type {
  CardProtocol,
  CardsPlayedEvent,
  PlayerCard,
  PlayerSeat,
} from '../../schemas/gameEvents';
import { useUiStore } from '../../stores/useUiStore';
import type { CharacterId, CharacterProfile } from '../../utils/characterCatalog';
import { resolveSeatCharacter } from '../../utils/characterCatalog';
import { PcbCard } from '../PcbCard';
import { classifyCard } from './hud/cardMarks';

export interface ArenaFallbackProps {
  opponents: PlayerSeat[];
  myPlayerId: string | null;
  myCharacter: CharacterProfile;
  selectedCharacterId: CharacterId;
  tablePileCount: number;
  currentTargetProtocol: CardProtocol | null;
  lastPlayedCards: CardsPlayedEvent | null;
  myCards: PlayerCard[];
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
}

/** Deterministic non-WebGL / test fallback: opponents row plus a flat 2D hand. */
export const ArenaFallback: React.FC<ArenaFallbackProps> = ({
  opponents,
  myCharacter,
  tablePileCount,
  currentTargetProtocol,
  lastPlayedCards,
  myCards,
  selectedCardIds,
  onToggleCard,
}) => {
  const holdToRevealCards = useUiStore((s) => s.holdToRevealCards);
  const isHandRevealed = useUiStore((s) => s.isHandRevealed);
  const isConcealed = holdToRevealCards && !isHandRevealed;

  return (
  <div
    data-testid="bunker-arena-fallback"
    className="relative z-10 flex flex-col justify-between p-4 pt-16 pb-20 min-h-[100dvh] table-grid"
  >
    <div className="flex flex-wrap justify-center gap-3">
      {opponents.map((opp) => {
        const char = resolveSeatCharacter(opp.characterId);
        return (
          <div
            key={opp.playerId}
            data-testid={`seat-avatar-${opp.playerId}`}
            className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/90 text-xs"
          >
            <span style={{ color: char.primaryColor }}>{`[${char.codename}]`}</span>{' '}
            <span>{opp.nickname}</span>
          </div>
        );
      })}
    </div>

    <div data-testid="pov-hand-fallback" className="flex flex-col items-center gap-3">
      <span className="text-xs font-bold">{`[${myCharacter.codename}]`}</span>
      {lastPlayedCards && (
        <div
          key={`${lastPlayedCards.playerId}-${lastPlayedCards.sequenceNumber ?? tablePileCount}`}
          data-testid="fallback-card-flight"
          className="flex gap-1"
          style={
            prefersReducedMotion() ? undefined : { animation: 'cardFlight 400ms ease-out both' }
          }
        >
          {Array.from({ length: Math.max(1, Math.min(3, lastPlayedCards.cardCount)) }).map(
            (_, i) => (
              <div key={i} className="w-6 h-9 rounded border border-emerald-500 bg-emerald-950" />
            )
          )}
        </div>
      )}
      <div className="flex gap-2">
        {myCards.map((c) => (
          <PcbCard
            key={c.id}
            id={c.id}
            protocol={c.protocol}
            visualSeed={c.visualSeed}
            faceDown={isConcealed}
            selected={selectedCardIds.includes(c.id)}
            badge={isConcealed ? null : classifyCard(c.protocol, currentTargetProtocol)}
            onClick={() => onToggleCard(c.id)}
          />
        ))}
      </div>
    </div>
  </div>
  );
};
