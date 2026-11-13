import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';

import { useI18n } from '../../../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../../../shared/theme/protocols';
import type { CardProtocol } from '../../../schemas/gameEvents';
import { useGameStore } from '../../../stores/useGameStore';
import { prefersReducedMotion } from '../hud/motion';
import { createPcbCardTexture } from '../pcbCardTexture';
import { ROUND_CARD_TOTAL_MS, roundCardPose } from '../roundCardPose';

const CARD_SCALE = 1.05;
const CARD_W = 0.42;
const CARD_H = 0.6;
const LABEL_Y = (CARD_H * CARD_SCALE) / 2 + 0.12;

interface FlipRun {
  protocol: CardProtocol;
  startedAtMs: number;
}

const LevitatingCard: React.FC<{ run: FlipRun; onDone: () => void }> = ({ run, onDone }) => {
  const { t } = useI18n();
  const groupRef = useRef<Group>(null);
  const scaleRef = useRef<Group>(null);
  const cardRef = useRef<Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const frontTexture = useMemo(
    () =>
      createPcbCardTexture(run.protocol, 0, null, false, {
        ready: t.arena.cardReady,
        selectHint: t.arena.cardSelectHint,
      }),
    [run.protocol, t]
  );
  const color = PROTOCOL_HEX[run.protocol] ?? '#10b981';

  // First-frame pose only; useFrame drives the real timeline from run.startedAtMs.
  const initial = roundCardPose(0, reducedMotion);

  useFrame(() => {
    const group = groupRef.current;
    const scaled = scaleRef.current;
    const card = cardRef.current;
    if (!group || !scaled || !card || doneRef.current) return;
    const pose = roundCardPose(Date.now() - run.startedAtMs, reducedMotion);
    group.position.y = pose.y;
    scaled.scale.setScalar(Math.max(pose.scale, 0.001));
    card.rotation.y = pose.rotationY;
    if (labelRef.current) labelRef.current.style.opacity = String(pose.scale);
    if (pose.done) {
      doneRef.current = true;
      onDone();
    }
  });

  // Unlit, so the protocol stays readable regardless of the table's lighting.
  const faceMaterial = <meshBasicMaterial map={frontTexture ?? undefined} color="#ffffff" />;

  return (
    <group ref={groupRef} position={[0, initial.y, 0]}>
      <group ref={scaleRef} scale={Math.max(initial.scale, 0.001)}>
        <group ref={cardRef} scale={CARD_SCALE}>
          {/* Protocol face on both sides, so the spinning card never shows its back. */}
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[CARD_W, CARD_H]} />
            {faceMaterial}
          </mesh>
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.002]}>
            <planeGeometry args={[CARD_W, CARD_H]} />
            {faceMaterial}
          </mesh>
        </group>
      </group>
      {/* Outside the scaled group, so the label stays above the card instead of shrinking into it. */}
      <Html position={[0, LABEL_Y, 0]} center distanceFactor={6.5} zIndexRange={[10, 0]}>
        <div
          ref={labelRef}
          data-testid="round-protocol-label"
          className="px-2.5 py-0.5 rounded-md border bg-black/85 font-mono text-xs font-black tracking-[0.2em] uppercase whitespace-nowrap select-none pointer-events-none"
          style={{ color, borderColor: color, textShadow: `0 0 10px ${color}`, opacity: initial.scale }}
        >
          {t.arena.hologramProtocol} {run.protocol}
        </div>
      </Html>
    </group>
  );
};

/**
 * At the start of every round a card rises out of the middle of the table, levitates and spins so
 * every seat can read the round's protocol, then sinks back. Nothing stays on screen afterwards.
 */
export const RoundProtocolCard3D: React.FC = () => {
  const [run, setRun] = useState<FlipRun | null>(() => {
    // The arena may mount right after RoundStarted (e.g. round 1) — still play a fresh intro.
    const intro = useGameStore.getState().roundIntro;
    if (!intro?.protocol || Date.now() - intro.startedAtMs > ROUND_CARD_TOTAL_MS) return null;
    return { protocol: intro.protocol, startedAtMs: intro.startedAtMs };
  });

  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        const intro = state.roundIntro;
        if (intro && intro !== prev.roundIntro && intro.protocol) {
          setRun({ protocol: intro.protocol, startedAtMs: intro.startedAtMs });
        }
      }),
    []
  );

  if (!run) return null;
  return <LevitatingCard key={run.startedAtMs} run={run} onDone={() => setRun(null)} />;
};
