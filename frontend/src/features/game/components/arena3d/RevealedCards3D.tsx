import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { Group, MeshStandardMaterial } from 'three';

import { useI18n } from '../../../../shared/i18n';
import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import { REVEAL_CARD_STAGGER_MS } from '../../utils/cinematicTiming';
import { classifyCard, MARK_COLOR } from './hud/cardMarks';
import { prefersReducedMotion } from './hud/motion';
import { createPcbCardBackTexture, createPcbCardTexture } from './pcbCardTexture';

export interface RevealedCards3DProps {
  cards: PlayerCard[];
  declaredProtocol: CardProtocol | null;
  /** Wall-clock start of the reveal; card i flips after (i + 1) * stagger. */
  startedAtMs: number;
}

const FLIP_DURATION_MS = 380;
const CARD_SPACING = 0.5;

interface RevealedCardProps {
  card: PlayerCard;
  index: number;
  total: number;
  declaredProtocol: CardProtocol | null;
  startedAtMs: number;
}

const RevealedCard: React.FC<RevealedCardProps> = ({
  card,
  index,
  total,
  declaredProtocol,
  startedAtMs,
}) => {
  const { t } = useI18n();
  const groupRef = useRef<Group>(null);
  const rimMaterialRef = useRef<MeshStandardMaterial>(null);
  const mark = classifyCard(card.protocol, declaredProtocol);
  const markColor = MARK_COLOR[mark];
  const frontTexture = useMemo(
    () =>
      createPcbCardTexture(card.protocol, card.visualSeed ?? index, mark, false, {
        ready: t.arena.cardReady,
        selectHint: t.arena.cardSelectHint,
      }),
    [card.protocol, card.visualSeed, index, mark, t]
  );
  const backTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const flipAt = startedAtMs + (index + 1) * REVEAL_CARD_STAGGER_MS;
    const progress = reducedMotion
      ? 1
      : Math.min(1, Math.max(0, (Date.now() - flipAt) / FLIP_DURATION_MS));
    const ease = 1 - Math.pow(1 - progress, 3);
    // Face-down (front facing the table) -> lifted -> face-up.
    group.rotation.x = -Math.PI / 2 + Math.PI * (1 - ease);
    group.position.y = 0.82 + Math.sin(ease * Math.PI) * 0.25;

    // Verdict highlighting after all cards are flipped
    const allFlippedAt = startedAtMs + total * REVEAL_CARD_STAGGER_MS + FLIP_DURATION_MS;
    const rim = rimMaterialRef.current;
    if (rim) {
      if (Date.now() >= allFlippedAt) {
        if (reducedMotion) {
          rim.emissiveIntensity = mark === 'bluff' ? 3.0 : mark === 'wild' ? 2.2 : 2.0;
        } else {
          const elapsed = (Date.now() - allFlippedAt) / 1000;
          if (mark === 'bluff') {
            rim.emissiveIntensity = 2.3 + 0.7 * Math.sin(elapsed * 8);
          } else if (mark === 'wild') {
            rim.emissiveIntensity = 1.8 + 0.4 * Math.sin(elapsed * 4);
          } else {
            rim.emissiveIntensity = 1.6 + 0.4 * Math.sin(elapsed * 4);
          }
        }
      } else {
        rim.emissiveIntensity = 1.6;
      }
    }
  });

  const x = (index - (total - 1) / 2) * CARD_SPACING;

  return (
    <group ref={groupRef} position={[x, 0.82, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Mark-coloured rim, so match / wild / bluff reads at a glance from far seats. */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.46, 0.64]} />
        <meshStandardMaterial
          ref={rimMaterialRef}
          color={markColor}
          emissive={markColor}
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[0.42, 0.6]} />
        <meshStandardMaterial map={frontTexture ?? undefined} color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.004]}>
        <planeGeometry args={[0.42, 0.6]} />
        <meshStandardMaterial map={backTexture ?? undefined} color="#ffffff" roughness={0.4} />
      </mesh>
    </group>
  );
};

/** Cards of the traced play, flipped face-up one by one in the middle of the table. */
export const RevealedCards3D: React.FC<RevealedCards3DProps> = ({
  cards,
  declaredProtocol,
  startedAtMs,
}) => (
  <group>
    {cards.map((card, i) => (
      <RevealedCard
        key={card.id}
        card={card}
        index={i}
        total={cards.length}
        declaredProtocol={declaredProtocol}
        startedAtMs={startedAtMs}
      />
    ))}
  </group>
);
