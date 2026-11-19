import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh, SpotLight } from 'three';
import * as THREE from 'three';

import { useI18n } from '../../../../shared/i18n';
import { prefersReducedMotion } from '../../../../shared/lib/motion';
import { PROTOCOL_HEX } from '../../../../shared/theme/protocols';
import type { CardProtocol, PlayerCard, RoomState } from '../../schemas/gameEvents';
import { BunkerTable3D } from './BunkerTable3D';
import { createPcbCardBackTexture } from './pcbCardTexture';
import { RevealedCards3D } from './RevealedCards3D';
import { ServerRackDiodes3D } from './ServerRackDiodes3D';
import { RoundProtocolCard3D } from './vfx/RoundProtocolCard3D';
import { emitCardLandingSparks, emitCardTrail } from './vfx/vfxEmitter';

export interface TableCenterpiece3DProps {
  tablePileCount: number;
  currentTargetProtocol: CardProtocol | null;
  roomState: RoomState | null;
  lastPlaySeatPosition?: [number, number, number] | null;
  lastPlayCardCount?: number;
  /** Changes identity on every CardsPlayed event; triggers the seat -> pile flight. */
  flightToken?: object | null;
  isMyTurn?: boolean;
  activePlayerNickname?: string;
  dischargeStartedAtMs?: number | null;
  revealedCards?: PlayerCard[] | null;
  revealDeclaredProtocol?: CardProtocol | null;
  revealStartedAtMs?: number | null;
  /** Hide the pile / turn pill while a cinematic owns the screen. */
  hideStatusPill?: boolean;
}

export const TableCenterpiece3D: React.FC<TableCenterpiece3DProps> = ({
  tablePileCount,
  currentTargetProtocol,
  roomState,
  lastPlaySeatPosition,
  lastPlayCardCount = 1,
  flightToken = null,
  isMyTurn = false,
  activePlayerNickname,
  dischargeStartedAtMs = null,
  revealedCards = null,
  revealDeclaredProtocol = null,
  revealStartedAtMs = null,
  hideStatusPill = false,
}) => {
  const { t } = useI18n();
  const lampGroupRef = useRef<Group>(null);
  const spotLightRef = useRef<SpotLight>(null);
  const laserScannerRef = useRef<Mesh>(null);
  const flyingGroupRef = useRef<Group>(null);
  const stackGroupRef = useRef<Group>(null);
  const landingBounceRef = useRef<number>(0);

  const [isFlying, setIsFlying] = useState(false);
  const flightProgressRef = useRef(1);
  const prevFlightTokenRef = useRef<object | null>(flightToken);
  const backTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);

  useEffect(() => {
    if (flightToken && flightToken !== prevFlightTokenRef.current && !prefersReducedMotion()) {
      flightProgressRef.current = 0;
      setIsFlying(true);
    }
    prevFlightTokenRef.current = flightToken;
  }, [flightToken]);

  const isGameOver = roomState === 'GameOver';
  const protocolColor = PROTOCOL_HEX[currentTargetProtocol ?? 'Alpha'] ?? '#10b981';
  const isBluffCheck = roomState === 'BluffCheck';
  // The discharge sequence usually plays after the server already moved on to RoundOver, so the
  // amber stage light has to last for the whole cinematic, not just the VoltageTest state.
  const isVoltageTest = roomState === 'VoltageTest' || Boolean(dischargeStartedAtMs);

  const stageAccentColor = isGameOver
    ? '#f59e0b'
    : isBluffCheck
    ? '#ef4444'
    : isVoltageTest
    ? '#f59e0b'
    : protocolColor;

  // Tungsten key light, only tinted by the stage accent: operators and cards keep their own colours.
  const keyLightColor = useMemo(
    () => new THREE.Color('#ffe6c4').lerp(new THREE.Color(stageAccentColor), 0.3),
    [stageAccentColor]
  );

  // The snapshot already counts the cards in flight: hold them back until they land.
  const visiblePileCount = isFlying
    ? Math.max(0, tablePileCount - Math.max(1, Math.min(3, lastPlayCardCount)))
    : tablePileCount;
  const isRevealing = Boolean(revealedCards && revealedCards.length > 0 && revealStartedAtMs !== null);

  const stackTransforms = useMemo(() => {
    const count = Math.min(isRevealing ? 0 : visiblePileCount, 14);
    return Array.from({ length: count }).map((_, i) => ({
      x: (((i * 29) % 11) - 5) * 0.015,
      z: (((i * 17) % 11) - 5) * 0.015,
      y: 0.77 + i * 0.022,
      rotY: (((i * 43) % 30) - 15) * (Math.PI / 180),
    }));
  }, [visiblePileCount, isRevealing]);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    const reducedMotion = prefersReducedMotion();

    if (lampGroupRef.current) {
      if (reducedMotion) {
        lampGroupRef.current.rotation.z = 0;
        lampGroupRef.current.rotation.x = 0;
      } else {
        lampGroupRef.current.rotation.z = Math.sin(elapsed * 0.9) * 0.035;
        lampGroupRef.current.rotation.x = Math.cos(elapsed * 0.7) * 0.025;
      }
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.lerp(keyLightColor, Math.min(1, delta * 3.5));
    }

    if (laserScannerRef.current && isBluffCheck) {
      laserScannerRef.current.position.z = reducedMotion ? 0 : Math.sin(elapsed * 5) * 0.65;
    }

    if (landingBounceRef.current > 0) {
      landingBounceRef.current = Math.max(0, landingBounceRef.current - delta * 6);
    }
    if (stackGroupRef.current) {
      stackGroupRef.current.position.y = reducedMotion ? 0 : Math.sin(landingBounceRef.current * Math.PI) * 0.035;
    }

    if (flightProgressRef.current < 1) {
      // ~400 ms seat -> pile tween
      const next = Math.min(1, flightProgressRef.current + delta * 2.5);
      flightProgressRef.current = next;

      if (flyingGroupRef.current) {
        const origin = lastPlaySeatPosition ?? [0, 1.1, 2.2];
        const ease = 1 - Math.pow(1 - next, 3);
        flyingGroupRef.current.position.x = origin[0] * (1 - ease);
        flyingGroupRef.current.position.z = origin[2] * (1 - ease);
        flyingGroupRef.current.position.y =
          0.82 + (1 - ease) * 0.35 + Math.sin(ease * Math.PI) * 0.75;
        flyingGroupRef.current.rotation.x = (1 - ease) * 1.4;
        flyingGroupRef.current.rotation.y = (1 - ease) * Math.PI;

        emitCardTrail(
          [
            flyingGroupRef.current.position.x,
            flyingGroupRef.current.position.y,
            flyingGroupRef.current.position.z,
          ],
          currentTargetProtocol ?? 'Alpha'
        );
      }

      if (next >= 1) {
        setIsFlying(false);
        emitCardLandingSparks([0, 0.78, 0]);
        landingBounceRef.current = 1.0;
      }
    }
  });

  return (
    <group>
      <ServerRackDiodes3D
        isBluffCheck={isBluffCheck}
        isVoltageTest={isVoltageTest}
        stageAccentColor={stageAccentColor}
      />

      {/* Overhead Swinging Bunker Lamp & Key Spotlight */}
      <group ref={lampGroupRef} position={[0, 3.85, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Enamel shade: open underneath so the lit interior is visible from the table */}
        <mesh position={[0, 0.02, 0]}>
          <coneGeometry args={[0.56, 0.3, 24, 1, true]} />
          <meshStandardMaterial
            color="#1d2027"
            metalness={0.85}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.128, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.57, 24]} />
          <meshStandardMaterial
            color="#000000"
            emissive={stageAccentColor}
            emissiveIntensity={2.2}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial color="#fff1d6" toneMapped={false} />
        </mesh>
        <spotLight
          ref={spotLightRef}
          position={[0, -0.15, 0]}
          angle={1.02}
          penumbra={0.85}
          intensity={62}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
          color="#ffe6c4"
        />
      </group>

      <BunkerTable3D accentColor={stageAccentColor} />

      {/* Round-start protocol card: flips face-up in the middle of the table, then sinks away */}
      {roomState !== 'Lobby' && <RoundProtocolCard3D />}

      {/* Pile Counter & Turn Status Info Pill next to Hologram */}
      {roomState !== 'Lobby' && !hideStatusPill && (
        <Html position={[0, 0.98, -0.32]} center distanceFactor={6.5} zIndexRange={[10, 0]}>
          <div className="px-3 py-1 rounded-full border border-zinc-700/80 bg-black/85 backdrop-blur-md font-mono text-[10px] flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,0,0,0.9)] select-none pointer-events-none whitespace-nowrap">
            <span className="text-zinc-300 font-bold">{t.arena.hologramPile}: {tablePileCount}</span>
            <span
              className={clsx(
                'font-extrabold',
                isMyTurn ? 'text-emerald-400 motion-safe:animate-pulse' : 'text-amber-400'
              )}
            >
              {isMyTurn
                ? `● ${t.arena.hologramYourTurn}`
                : `○ ${t.arena.hologramTurnOf}: ${activePlayerNickname ?? '...'}`}
            </span>
          </div>
        </Html>
      )}

      {/* 3D PCB Packet Stack on Central Bus */}
      <group ref={stackGroupRef}>
        {stackTransforms.map((card, idx) => (
          <group key={idx} position={[card.x, card.y, card.z]} rotation={[0, card.rotY, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.018, 0.62]} />
              <meshStandardMaterial
                map={backTexture ?? undefined}
                color="#ffffff"
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Parabolic 3D Card Flight from Active Player Seat */}
      {isFlying && (
        <group ref={flyingGroupRef}>
          {Array.from({ length: Math.max(1, Math.min(3, lastPlayCardCount)) }).map((_, i) => (
            <mesh key={i} position={[(i - 1) * 0.22, i * 0.03, 0]} castShadow>
              <boxGeometry args={[0.42, 0.02, 0.62]} />
              {/* Played face-down: show the card back, with a protocol-coloured glow trail. */}
              <meshStandardMaterial
                map={backTexture ?? undefined}
                color="#ffffff"
                emissive={protocolColor}
                emissiveIntensity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {isRevealing && revealedCards && revealStartedAtMs !== null && (
        <RevealedCards3D
          cards={revealedCards}
          declaredProtocol={revealDeclaredProtocol}
          startedAtMs={revealStartedAtMs}
        />
      )}

      {/* Laser Diagnostic Scanner Beam during CALL TRACE (BluffCheck) */}
      {isBluffCheck && (
        <mesh ref={laserScannerRef} position={[0, 0.92, 0]}>
          <boxGeometry args={[1.5, 0.03, 0.06]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={2.0}
          />
        </mesh>
      )}
    </group>
  );
};
