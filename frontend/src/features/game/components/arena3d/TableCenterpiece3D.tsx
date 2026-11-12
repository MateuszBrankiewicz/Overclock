import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh } from 'three';

import { useI18n } from '../../../../shared/i18n';
import type { CardProtocol, PlayerCard, RoomState } from '../../schemas/gameEvents';
import { prefersReducedMotion } from './hud/motion';
import { LightningArc3D } from './LightningArc3D';
import { createPcbCardBackTexture } from './pcbCardTexture';
import { RevealedCards3D } from './RevealedCards3D';

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
  shockTargetPos?: [number, number, number] | null;
  isOverloadedShock?: boolean;
  testedRiskLevel?: number;
  revealedCards?: PlayerCard[] | null;
  revealDeclaredProtocol?: CardProtocol | null;
  revealStartedAtMs?: number | null;
  bluffDetected?: boolean;
  revealLoserPos?: [number, number, number] | null;
}

const PROTOCOL_HEX: Record<string, string> = {
  Alpha: '#10b981',
  Beta: '#f59e0b',
  Gamma: '#06b6d4',
  Glitch: '#e879f9',
  Corrupted: '#ef4444',
};

export const TableCenterpiece3D: React.FC<TableCenterpiece3DProps> = ({
  tablePileCount,
  currentTargetProtocol,
  roomState,
  lastPlaySeatPosition,
  lastPlayCardCount = 1,
  flightToken = null,
  isMyTurn = false,
  activePlayerNickname,
  shockTargetPos,
  isOverloadedShock = false,
  testedRiskLevel = 1,
  revealedCards = null,
  revealDeclaredProtocol = null,
  revealStartedAtMs = null,
  bluffDetected = false,
  revealLoserPos = null,
}) => {
  const { t } = useI18n();
  const lampGroupRef = useRef<Group>(null);
  const capacitorDrumRef = useRef<Group>(null);
  const laserScannerRef = useRef<Mesh>(null);
  const flyingGroupRef = useRef<Group>(null);

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

  const protocolColor = PROTOCOL_HEX[currentTargetProtocol ?? 'Alpha'] ?? '#10b981';
  const isBluffCheck = roomState === 'BluffCheck';
  const isVoltageTest = roomState === 'VoltageTest' || Boolean(shockTargetPos);

  const stageAccentColor = isBluffCheck
    ? '#ef4444'
    : isVoltageTest
    ? '#f59e0b'
    : protocolColor;

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

    if (lampGroupRef.current) {
      lampGroupRef.current.rotation.z = Math.sin(elapsed * 0.9) * 0.035;
      lampGroupRef.current.rotation.x = Math.cos(elapsed * 0.7) * 0.025;
    }

    if (capacitorDrumRef.current && isVoltageTest) {
      if (shockTargetPos) {
        // Aim capacitor turret directly at the target operator
        const aimAngle = Math.atan2(shockTargetPos[0], shockTargetPos[2]);
        capacitorDrumRef.current.rotation.y = aimAngle;
        capacitorDrumRef.current.position.y = 1.35;
      } else {
        capacitorDrumRef.current.rotation.y += delta * 7.5;
        capacitorDrumRef.current.position.y = 1.25 + Math.sin(elapsed * 6) * 0.05;
      }
    }

    if (laserScannerRef.current && isBluffCheck) {
      laserScannerRef.current.position.z = Math.sin(elapsed * 5) * 0.65;
    }

    if (flightProgressRef.current < 1) {
      // ~400 ms seat -> pile tween
      const next = Math.min(1, flightProgressRef.current + delta * 2.5);
      flightProgressRef.current = next;
      if (next >= 1) setIsFlying(false);

      if (flyingGroupRef.current) {
        const origin = lastPlaySeatPosition ?? [0, 1.1, 2.2];
        const ease = 1 - Math.pow(1 - next, 3);
        flyingGroupRef.current.position.x = origin[0] * (1 - ease);
        flyingGroupRef.current.position.z = origin[2] * (1 - ease);
        flyingGroupRef.current.position.y =
          0.82 + (1 - ease) * 0.35 + Math.sin(ease * Math.PI) * 0.75;
        flyingGroupRef.current.rotation.x = (1 - ease) * 1.4;
        flyingGroupRef.current.rotation.y = (1 - ease) * Math.PI;
      }
    }
  });

  return (
    <group>
      {/* Background Underground Bunker Server Racks */}
      {[-3.8, -1.9, 1.9, 3.8].map((rx, idx) => (
        <group key={idx} position={[rx, 1.5, -4.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.1, 3.0, 0.7]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.4, 0.36]}>
            <boxGeometry args={[0.85, 0.06, 0.02]} />
            <meshStandardMaterial
              color={stageAccentColor}
              emissive={stageAccentColor}
              emissiveIntensity={1.6}
            />
          </mesh>
          <mesh position={[0, -0.3, 0.36]}>
            <boxGeometry args={[0.85, 0.06, 0.02]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}

      {/* Overhead Swinging Bunker Lamp & Volumetric Cone */}
      <group ref={lampGroupRef} position={[0, 3.85, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <coneGeometry args={[0.48, 0.28, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial
            color={stageAccentColor}
            emissive={stageAccentColor}
            emissiveIntensity={3}
          />
        </mesh>
        <mesh position={[0, -1.65, 0]}>
          <coneGeometry args={[2.55, 3.3, 24, 1, true]} />
          <meshBasicMaterial
            color={stageAccentColor}
            transparent
            opacity={0.07}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Main Octagonal Bunker Table Top */}
      <mesh position={[0, 0.68, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.22, 2.34, 0.14, 8]} />
        <meshStandardMaterial color="#09090b" metalness={0.82} roughness={0.24} />
      </mesh>

      {/* Inner Dielectric Glass Surface */}
      <mesh position={[0, 0.755, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 1.9, 0.02, 8]} />
        <meshStandardMaterial color="#041f14" metalness={0.9} roughness={0.14} />
      </mesh>

      {/* Glowing Protocol Circuit Rings on Table Surface */}
      <mesh position={[0, 0.768, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.22, 1.28, 32]} />
        <meshStandardMaterial
          color={stageAccentColor}
          emissive={stageAccentColor}
          emissiveIntensity={1.9}
        />
      </mesh>
      <mesh position={[0, 0.768, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.56, 24]} />
        <meshStandardMaterial
          color={stageAccentColor}
          emissive={stageAccentColor}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Heavy Table Pedestal */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.88, 0.68, 8]} />
        <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Diegetic Hologram Above Table Center: Active Target Protocol & Pile Counter */}
      {roomState !== 'Lobby' && (
        <Html position={[0, 1.15, -0.35]} center distanceFactor={6.5} zIndexRange={[10, 0]}>
          <div className="px-3 py-1 rounded-full border border-zinc-700/80 bg-black/85 backdrop-blur-md font-mono text-[10px] flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,0,0,0.9)] select-none pointer-events-none whitespace-nowrap">
            <span
              className="font-black px-2 py-0.5 rounded text-black"
              style={{ backgroundColor: protocolColor }}
            >
              {t.arena.hologramProtocol}: {currentTargetProtocol ?? 'ALPHA'}
            </span>
            <span className="text-zinc-300 font-bold">{t.arena.hologramPile}: {tablePileCount}</span>
            <span
              className={clsx(
                'font-extrabold',
                isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
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
            emissiveIntensity={3.5}
          />
        </mesh>
      )}

      {/* 3D 6-Chamber High-Voltage Dielectric Revolver Cylinder during VoltageTest & Shock */}
      {isVoltageTest && (
        <group ref={capacitorDrumRef} position={[0, 1.25, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.48, 18]} />
            <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.15} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 6;
            const cx = Math.cos(angle) * 0.28;
            const cz = Math.sin(angle) * 0.28;
            const isHotChamber = i < Math.max(1, Math.min(6, testedRiskLevel));
            return (
              <mesh key={i} position={[cx, 0, cz]}>
                <cylinderGeometry args={[0.08, 0.08, 0.52, 12]} />
                <meshStandardMaterial
                  color={isHotChamber ? '#ef4444' : '#f59e0b'}
                  emissive={isHotChamber ? '#ef4444' : '#f59e0b'}
                  emissiveIntensity={isHotChamber ? 3.5 : 1.4}
                />
              </mesh>
            );
          })}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.56, 0.02, 12, 32]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={2.8}
            />
          </mesh>
        </group>
      )}

      {/* Short 3D Lightning Bolt fired from Table Center towards loser during trace verdict */}
      {isRevealing && revealLoserPos && (
        <LightningArc3D
          start={[0, 1.1, 0]}
          end={revealLoserPos}
          color={bluffDetected ? '#ef4444' : '#38bdf8'}
          intensity={8}
        />
      )}

      {/* 3D Crackling Lightning Bolt fired from Cylinder directly into Target Operator */}
      {shockTargetPos && (
        <LightningArc3D
          start={[0, 1.35, 0]}
          end={shockTargetPos}
          color={isOverloadedShock ? '#ef4444' : '#38bdf8'}
          intensity={isOverloadedShock ? 12 : 7}
        />
      )}
    </group>
  );
};
