import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Euler,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  Quaternion,
  type Sprite,
  Vector3,
} from 'three';

import { useI18n } from '../../../../shared/i18n';
import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import { revealCardFlipAtMs } from '../../utils/cinematicTiming';
import { type CardMark, classifyCard, MARK_COLOR } from './hud/cardMarks';
import { prefersReducedMotion } from './hud/motion';
import { createPcbCardBackTexture, createPcbCardTexture } from './pcbCardTexture';
import {
  presentationLayout,
  REVEAL_CARD_HEIGHT,
  REVEAL_CARD_WIDTH,
  REVEAL_FLIP_MS,
  REVEAL_LAST_FLIP_MS,
  revealCardOffsetX,
  revealCardsSettledAtMs,
  revealFlipProgress,
  revealLiftProgress,
} from './revealCardPose';
import { emitCardRevealSparks } from './vfx/vfxEmitter';

export interface RevealedCards3DProps {
  cards: PlayerCard[];
  declaredProtocol: CardProtocol | null;
  /** Wall-clock start of the reveal; card i flips at revealCardFlipAtMs(i, startedAtMs). */
  startedAtMs: number;
}

/** Where the contested cards lie before they are lifted (the table pile). */
const PILE_Y = 0.82;
const PILE_Z = 0.15;
const TABLE_CENTER = new Vector3(0, 0.85, 0);
/** Face-down on the table: the front looks at the felt. */
const PILE_QUATERNION = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));
const Y_AXIS = new Vector3(0, 1, 0);
const BLUFF_JOLT_MS = 120;

const MARK_GLYPH: Record<CardMark, string> = {
  match: '✓',
  wild: '★',
  bluff: '✖',
};
/** The reveal paints a caught bluff red (the hand legend keeps its amber warning). */
const REVEAL_MARK_COLOR: Record<CardMark, string> = { ...MARK_COLOR, bluff: '#ef4444' };
const markTextureCache = new Map<CardMark, CanvasTexture>();

/** Big round ✓ / ★ / ✖ badge shown over a card once it is face-up, readable from any seat. */
function markTexture(mark: CardMark): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cached = markTextureCache.get(mark);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const color = REVEAL_MARK_COLOR[mark];
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9,9,11,0.88)';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(MARK_GLYPH[mark], 64, 68);
  const texture = new CanvasTexture(canvas);
  markTextureCache.set(mark, texture);
  return texture;
}

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
  const rimMeshRef = useRef<Mesh>(null);
  const signRef = useRef<Sprite>(null);
  const mark = classifyCard(card.protocol, declaredProtocol);
  const markColor = REVEAL_MARK_COLOR[mark];
  const frontTexture = useMemo(
    () =>
      createPcbCardTexture(card.protocol, card.visualSeed ?? index, mark, false, {
        ready: t.arena.cardReady,
        selectHint: t.arena.cardSelectHint,
      }),
    [card.protocol, card.visualSeed, index, mark, t]
  );
  const backTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);
  const signTexture = useMemo(() => markTexture(mark), [mark]);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const sparkEmittedRef = useRef(false);
  const offsetX = revealCardOffsetX(index, total);
  const isLast = index === total - 1;

  const scratch = useMemo(
    () => ({
      forward: new Vector3(),
      up: new Vector3(),
      right: new Vector3(),
      present: new Vector3(),
      pile: new Vector3(offsetX, PILE_Y, PILE_Z),
      presentQuat: new Quaternion(),
      parentQuat: new Quaternion(),
      flipQuat: new Quaternion(),
      worldPos: new Vector3(),
    }),
    [offsetX]
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const now = Date.now();
    const camera = state.camera as PerspectiveCamera;
    const s = scratch;

    // Presentation pose in world space: a row standing in front of the camera, above the HUD.
    const layout = presentationLayout(
      camera.fov ?? 50,
      camera.aspect ?? state.size.width / Math.max(1, state.size.height),
      camera.position.distanceTo(TABLE_CENTER)
    );
    s.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    s.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    s.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    s.present
      .copy(camera.position)
      .addScaledVector(s.forward, layout.distance)
      .addScaledVector(s.up, layout.lift)
      .addScaledVector(s.right, offsetX * layout.scale);

    // Express it in the parent's space, so any transform of the table group is respected.
    const parent = group.parent;
    if (parent) {
      parent.worldToLocal(s.present);
      parent.getWorldQuaternion(s.parentQuat).invert();
    } else {
      s.parentQuat.identity();
    }

    const flipAt = revealCardFlipAtMs(index, startedAtMs);
    const lift = revealLiftProgress(now - startedAtMs, index, reducedMotion);
    const flip = revealFlipProgress(now, flipAt, isLast, reducedMotion);

    // Facing the camera, rotated around Y: back to the camera until the card turns.
    s.flipQuat.setFromAxisAngle(Y_AXIS, Math.PI * (1 - flip));
    s.presentQuat.copy(s.parentQuat).multiply(camera.quaternion).multiply(s.flipQuat);

    group.position.lerpVectors(s.pile, s.present, lift);
    group.position.y += Math.sin(lift * Math.PI) * 0.3;
    group.quaternion.slerpQuaternions(PILE_QUATERNION, s.presentQuat, lift);
    group.scale.setScalar(1 + (layout.scale - 1) * lift);

    // Suspense: face-down cards twitch under the scanner, harder the closer their flip gets.
    const untilFlip = flipAt - now;
    if (!reducedMotion && untilFlip > 0 && lift >= 1) {
      const tension = 1 - Math.min(1, untilFlip / 1200);
      group.rotateZ(Math.sin(now * 0.045 + index * 1.7) * 0.035 * tension);
    }
    // A caught bluff jolts its card once it is face-up.
    const sinceFlipped = now - flipAt;
    if (!reducedMotion && mark === 'bluff' && flip >= 1 && sinceFlipped < 1000) {
      const joltT = sinceFlipped - (isLast ? REVEAL_LAST_FLIP_MS : REVEAL_FLIP_MS);
      if (joltT >= 0 && joltT < BLUFF_JOLT_MS) {
        group.position.x += Math.sin(joltT * 0.6) * 0.02 * layout.scale;
      }
    }

    // The rim and the sign give the verdict away, so they only show once the face turns up.
    const faceUp = flip >= 0.5;
    if (rimMeshRef.current) rimMeshRef.current.visible = faceUp;
    const sign = signRef.current;
    if (sign) {
      sign.visible = faceUp;
      const pop = reducedMotion ? 1 : Math.min(1, Math.max(0, (flip - 0.5) * 2));
      sign.scale.setScalar(0.26 * (0.6 + 0.4 * pop));
    }

    if (flip >= 0.75 && !sparkEmittedRef.current) {
      sparkEmittedRef.current = true;
      group.getWorldPosition(s.worldPos);
      emitCardRevealSparks([s.worldPos.x, s.worldPos.y, s.worldPos.z], mark === 'bluff');
    }

    // Verdict highlighting after all cards are flipped
    const allFlippedAt = revealCardsSettledAtMs(total, startedAtMs);
    const rim = rimMaterialRef.current;
    if (rim) {
      if (now >= allFlippedAt) {
        if (reducedMotion) {
          rim.emissiveIntensity = mark === 'bluff' ? 1.5 : mark === 'wild' ? 1.1 : 1.0;
        } else {
          const elapsed = (now - allFlippedAt) / 1000;
          if (mark === 'bluff') {
            rim.emissiveIntensity = 1.2 + 0.4 * Math.sin(elapsed * 8);
          } else if (mark === 'wild') {
            rim.emissiveIntensity = 0.9 + 0.2 * Math.sin(elapsed * 4);
          } else {
            rim.emissiveIntensity = 0.8 + 0.2 * Math.sin(elapsed * 4);
          }
        }
      } else {
        rim.emissiveIntensity = 0.8;
      }
    }
  });

  return (
    <group ref={groupRef} position={[offsetX, PILE_Y, PILE_Z]} quaternion={PILE_QUATERNION}>
      {/* Mark-coloured rim, so match / wild / bluff reads at a glance from far seats. */}
      <mesh ref={rimMeshRef} position={[0, 0, -0.002]} visible={false}>
        <planeGeometry args={[REVEAL_CARD_WIDTH + 0.04, REVEAL_CARD_HEIGHT + 0.04]} />
        <meshStandardMaterial
          ref={rimMaterialRef}
          color={markColor}
          emissive={markColor}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[REVEAL_CARD_WIDTH, REVEAL_CARD_HEIGHT]} />
        {/* Unlit and slightly below white: the face must stay readable under bloom and the alarm light. */}
        <meshBasicMaterial map={frontTexture ?? undefined} color="#d4d4d8" />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.004]}>
        <planeGeometry args={[REVEAL_CARD_WIDTH, REVEAL_CARD_HEIGHT]} />
        <meshBasicMaterial map={backTexture ?? undefined} color="#d4d4d8" />
      </mesh>
      {signTexture && (
        <sprite ref={signRef} position={[0, REVEAL_CARD_HEIGHT / 2 + 0.17, 0.01]} visible={false}>
          <spriteMaterial map={signTexture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
};

/** Cards of the traced play: lifted off the pile, stood up before the camera and turned one by one. */
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
