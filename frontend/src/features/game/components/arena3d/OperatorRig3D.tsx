import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';

import { useI18n } from '../../../../shared/i18n';
import type { PlayerSeat } from '../../schemas/gameEvents';
import type { CharacterProfile } from '../../utils/characterCatalog';
import { computeDeathPose, computeShockPose } from './deathPose';
import { createOperatorVisorTexture } from './operatorVisorTexture';
import { createPcbCardBackTexture } from './pcbCardTexture';

export interface OperatorRig3DProps {
  seat: PlayerSeat;
  character: CharacterProfile;
  position: [number, number, number];
  rotationY: number;
  isActiveTurn: boolean;
  isPendingVoltage: boolean;
  lookTargetAngle?: number;
  isBeingShocked?: boolean;
  isOverloaded?: boolean;
  cinematicStartTimeMs?: number | null;
}

export const OperatorRig3D: React.FC<OperatorRig3DProps> = ({
  seat,
  character,
  position,
  rotationY,
  isActiveTurn,
  isPendingVoltage,
  lookTargetAngle = 0,
  isBeingShocked = false,
  isOverloaded = false,
  cinematicStartTimeMs = null,
}) => {
  const { t } = useI18n();
  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const chairRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const handFanRef = useRef<Group>(null);
  const sparkFlashRef = useRef<Mesh>(null);

  const isEliminated = seat.status === 'Eliminated' || isOverloaded;
  const risk = seat.riskLevel ?? 1;
  const visibleCards = Math.min(seat.handCount, 6);

  // Deterministic seed for this operator
  const seed = useMemo(() => {
    return seat.playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  }, [seat.playerId]);

  const initialEliminatedRef = useRef<boolean>(seat.status === 'Eliminated');
  const liveStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      (isEliminated || isBeingShocked) &&
      !initialEliminatedRef.current &&
      liveStartTimeRef.current === null
    ) {
      liveStartTimeRef.current = cinematicStartTimeMs ?? Date.now();
    }
  }, [isEliminated, isBeingShocked, cinematicStartTimeMs]);

  const visorTexture = useMemo(
    () =>
      createOperatorVisorTexture(
        character,
        isEliminated,
        isPendingVoltage || isBeingShocked,
        isActiveTurn,
        {
          blackout: t.arena.visorBlackout,
          transmitting: t.arena.visorTransmitting,
          locked: t.arena.visorLocked,
          highVoltage: t.arena.visorHighVoltage,
          synthesis: t.arena.visorSynthesis,
        }
      ),
    [character, isEliminated, isPendingVoltage, isBeingShocked, isActiveTurn, t]
  );
  const cardBackTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    // 1. Elimination / Death Slam Animation (Flys onto the table desk and falls off!)
    if (isEliminated) {
      let deathElapsed = 5.0; // Default: settled if loaded while already eliminated
      if (!initialEliminatedRef.current) {
        const startMs = cinematicStartTimeMs ?? liveStartTimeRef.current;
        if (startMs) {
          deathElapsed = Math.max(0, (Date.now() - startMs) / 1000);
        }
      }

      const pose = computeDeathPose(deathElapsed, seed);
      if (bodyRef.current) {
        bodyRef.current.position.set(...pose.bodyPosition);
        bodyRef.current.rotation.set(...pose.bodyRotation);
      }
      if (chairRef.current) {
        chairRef.current.position.set(...pose.chairPosition);
        chairRef.current.rotation.set(...pose.chairRotation);
      }
      if (headRef.current) {
        headRef.current.rotation.x = pose.headRotationX;
      }
      if (handFanRef.current) {
        handFanRef.current.visible = deathElapsed < 1.1;
      }
      if (sparkFlashRef.current) {
        sparkFlashRef.current.visible = pose.isShockActive;
        if (pose.isShockActive) {
          sparkFlashRef.current.scale.setScalar(1 + Math.sin(elapsed * 50) * 0.4);
        }
      }
      return;
    }

    // 2. Electro-Spasm Shock (Survived voltage test)
    if (isBeingShocked) {
      let elapsed = 0.5;
      const startMs = cinematicStartTimeMs ?? liveStartTimeRef.current;
      if (startMs) {
        elapsed = Math.max(0, (Date.now() - startMs) / 1000);
      }
      const pose = computeShockPose(elapsed, seed);
      if (bodyRef.current) {
        bodyRef.current.position.set(...pose.bodyPosition);
        bodyRef.current.rotation.set(...pose.bodyRotation);
      }
      if (headRef.current) {
        headRef.current.rotation.x = pose.headRotationX;
      }
      if (sparkFlashRef.current) {
        sparkFlashRef.current.visible = pose.isShockActive;
        if (pose.isShockActive) {
          sparkFlashRef.current.scale.setScalar(1 + Math.sin(elapsed * 50) * 0.4);
        }
      }
      return;
    }

    // 3. Normal Living Idle / Breathing / Voltage Tension
    if (sparkFlashRef.current) {
      sparkFlashRef.current.visible = false;
    }
    if (handFanRef.current) {
      handFanRef.current.visible = true;
      handFanRef.current.position.y =
        0.92 + Math.sin(elapsed * (isActiveTurn ? 3.8 : 1.8)) * (isActiveTurn ? 0.035 : 0.012);
    }
    if (bodyRef.current) {
      if (isPendingVoltage) {
        bodyRef.current.position.x = Math.sin(elapsed * 48) * 0.04;
        bodyRef.current.position.y = Math.cos(elapsed * 36) * 0.025;
        bodyRef.current.rotation.x = -0.15 + Math.sin(elapsed * 35) * 0.06;
      } else {
        bodyRef.current.position.set(0, Math.sin(elapsed * 2.1 + position[0]) * 0.025, 0);
        bodyRef.current.rotation.set(0, 0, 0);
      }
    }

    if (headRef.current) {
      if (isPendingVoltage) {
        headRef.current.rotation.x = -0.15 + Math.sin(elapsed * 35) * 0.08;
        headRef.current.rotation.z = Math.cos(elapsed * 28) * 0.08;
      } else {
        headRef.current.rotation.x = isActiveTurn ? -0.05 : Math.sin(elapsed * 1.4) * 0.035;
        headRef.current.rotation.y =
          lookTargetAngle * 0.25 + Math.sin(elapsed * (isActiveTurn ? 2.6 : 0.9)) * 0.09;
        headRef.current.rotation.z = 0;
      }
    }

    if (coreRef.current) {
      coreRef.current.rotation.y = elapsed * (1.4 + risk * 0.65);
      coreRef.current.rotation.x = elapsed * 0.9;
    }
  });

  const activeColor = isEliminated
    ? '#3f3f46'
    : isBeingShocked || isPendingVoltage
    ? '#ef4444'
    : character.primaryColor;

  return (
    <group ref={rootRef} position={position} rotation={[0, rotationY, 0]}>
      {/* High-Back Tactical Cyber Chair Behind Operator */}
      <group ref={chairRef} position={[0, 0, -0.32]}>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.88, 1.65, 0.12]} />
          <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.95, 0.065]}>
          <boxGeometry args={[0.1, 1.2, 0.02]} />
          <meshStandardMaterial
            color={activeColor}
            emissive={activeColor}
            emissiveIntensity={isEliminated ? 0.05 : 1.2}
          />
        </mesh>
        <mesh position={[-0.36, 1.38, 0.08]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.18, 0.36, 0.16]} />
          <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.36, 1.38, 0.08]} rotation={[0, -0.35, 0]}>
          <boxGeometry args={[0.18, 0.36, 0.16]} />
          <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Operator Main Body Group (Can slam onto table and roll off to floor) */}
      <group ref={bodyRef}>
        {/* Sculpted Cyberpunk Torso & Armored Jacket */}
        <group position={[0, 0.62, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.74, 0.88, 0.44]} />
            <meshStandardMaterial
              color={character.armorColor}
              metalness={0.68}
              roughness={0.32}
            />
          </mesh>

          <mesh position={[0, 0.08, 0.23]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.62, 0.56, 0.08]} />
            <meshStandardMaterial color="#18181b" metalness={0.82} roughness={0.22} />
          </mesh>

          <mesh position={[0, 0.12, 0.28]}>
            <boxGeometry args={[0.28, 0.14, 0.03]} />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={
                isEliminated ? 0.05 : isBeingShocked ? 6 : isActiveTurn ? 2.6 : 1.3
              }
            />
          </mesh>
          <mesh position={[-0.22, 0.1, 0.27]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.04, 0.48, 0.02]} />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={isEliminated ? 0 : isBeingShocked ? 4 : 1.1}
            />
          </mesh>
          <mesh position={[0.22, 0.1, 0.27]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.04, 0.48, 0.02]} />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={isEliminated ? 0 : isBeingShocked ? 4 : 1.1}
            />
          </mesh>

          {/* High Cyberpunk Jacket Collar Around Neck */}
          <mesh position={[-0.24, 0.48, -0.02]} rotation={[0, 0, 0.28]} castShadow>
            <boxGeometry args={[0.12, 0.24, 0.42]} />
            <meshStandardMaterial color={character.armorColor} metalness={0.75} roughness={0.28} />
          </mesh>
          <mesh position={[0.24, 0.48, -0.02]} rotation={[0, 0, -0.28]} castShadow>
            <boxGeometry args={[0.12, 0.24, 0.42]} />
            <meshStandardMaterial color={character.armorColor} metalness={0.75} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.48, -0.2]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.48, 0.24, 0.1]} />
            <meshStandardMaterial color={character.armorColor} metalness={0.75} roughness={0.28} />
          </mesh>

          <mesh position={[0, 0.48, 0.02]}>
            <cylinderGeometry args={[0.13, 0.16, 0.22, 12]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>

        {/* Heavy Shoulder Pauldrons & Risk Coils */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.48, 0.94, 0.02]}>
            <mesh rotation={[0, 0, side * -0.25]} castShadow>
              <boxGeometry args={[0.28, 0.24, 0.42]} />
              <meshStandardMaterial color={character.armorColor} metalness={0.75} roughness={0.28} />
            </mesh>
            <mesh position={[side * 0.04, 0.18, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.2, 12]} />
              <meshStandardMaterial
                color={risk >= 4 ? '#ef4444' : activeColor}
                emissive={risk >= 4 ? '#ef4444' : activeColor}
                emissiveIntensity={isEliminated ? 0 : isBeingShocked ? 6 : 0.45 * risk}
              />
            </mesh>
            <mesh position={[side * 0.05, -0.22, 0.16]} rotation={[0.65, 0, side * -0.15]} castShadow>
              <boxGeometry args={[0.16, 0.46, 0.16]} />
              <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh
              position={[side * -0.06, -0.34, 0.42]}
              rotation={[1.38, side * 0.35, 0]}
              castShadow
            >
              <boxGeometry args={[0.15, 0.44, 0.15]} />
              <meshStandardMaterial color={character.armorColor} metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Sculpted Articulated Head + High-Res Animated Visor Screen */}
        <group ref={headRef} position={[0, 1.32, 0.06]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.44, 0.46]} />
            <meshStandardMaterial
              color={character.visorStyle === 'crt' ? '#1f122b' : '#18181b'}
              metalness={0.78}
              roughness={0.24}
            />
          </mesh>

          <mesh position={[0, 0.24, -0.02]} castShadow>
            <boxGeometry args={[0.32, 0.08, 0.44]} />
            <meshStandardMaterial color={character.armorColor} metalness={0.8} roughness={0.25} />
          </mesh>

          <mesh position={[-0.27, 0.02, -0.02]}>
            <boxGeometry args={[0.06, 0.22, 0.22]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.27, 0.02, -0.02]}>
            <boxGeometry args={[0.06, 0.22, 0.22]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.2} />
          </mesh>

          {character.visorStyle === 'dome' && (
            <group position={[0, 0.28, 0]}>
              <mesh>
                <sphereGeometry args={[0.22, 16, 12]} />
                <meshStandardMaterial
                  color="#083344"
                  transparent
                  opacity={0.55}
                  metalness={0.2}
                  roughness={0.1}
                />
              </mesh>
              <mesh ref={coreRef}>
                <octahedronGeometry args={[0.11, 0]} />
                <meshStandardMaterial
                  color={activeColor}
                  emissive={activeColor}
                  emissiveIntensity={isEliminated ? 0 : 2.8}
                  wireframe
                />
              </mesh>
            </group>
          )}

          <mesh position={[0, 0.02, 0.236]}>
            <planeGeometry args={[0.42, 0.24]} />
            <meshStandardMaterial
              map={visorTexture ?? undefined}
              emissiveMap={visorTexture ?? undefined}
              emissive="#ffffff"
              emissiveIntensity={isEliminated ? 0.35 : isBeingShocked ? 4 : 1.35}
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>

          <mesh position={[0, -0.16, 0.14]} castShadow>
            <boxGeometry args={[0.38, 0.12, 0.26]} />
            <meshStandardMaterial color={character.armorColor} metalness={0.82} roughness={0.25} />
          </mesh>
        </group>

        {/* Fanned 3D PCB Cards in Hand (Only visible when alive) */}
        {!isEliminated && visibleCards > 0 && (
          <group ref={handFanRef} position={[0, 0.92, 0.62]}>
            {Array.from({ length: visibleCards }).map((_, i) => {
              const spread = (i - (visibleCards - 1) / 2) * 0.13;
              return (
                <mesh
                  key={i}
                  position={[spread, Math.abs(spread) * -0.1, i * 0.012]}
                  rotation={[-0.2, 0, -spread * 0.85]}
                  castShadow
                >
                  <boxGeometry args={[0.2, 0.28, 0.012]} />
                  <meshStandardMaterial
                    map={cardBackTexture ?? undefined}
                    color="#ffffff"
                    metalness={0.6}
                    roughness={0.25}
                  />
                </mesh>
              );
            })}
          </group>
        )}

        {/* Electrical Arc Flash Flare when being shocked */}
        {isBeingShocked && (
          <mesh ref={sparkFlashRef} position={[0, 1.05, 0.3]}>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} wireframe />
          </mesh>
        )}
      </group>

      {/* In-Bounds Table Plaque Label (Hidden when completely eliminated) */}
      {!isEliminated && (
        <Html position={[0, 1.04, 0.86]} center distanceFactor={6.2} zIndexRange={[10, 0]}>
          <div
            className={clsx(
              'px-2 py-0.5 rounded-md border font-mono text-[9px] whitespace-nowrap backdrop-blur-md transition-all select-none pointer-events-none shadow-md',
              isPendingVoltage || isBeingShocked
                ? 'bg-red-950/95 border-red-500 text-red-100 animate-pulse'
                : isActiveTurn
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.6)]'
                : 'bg-zinc-950/90 border-zinc-700/80 text-zinc-200'
            )}
          >
            <span className="font-extrabold">{seat.nickname}</span>{' '}
            <span className="opacity-75">{`[${character.codename}]`}</span>{' '}
            <span className="text-emerald-300 font-bold">• {seat.handCount}k</span>{' '}
            <span className={clsx(risk >= 4 ? 'text-red-400 font-bold' : 'text-amber-400')}>
              ⚡{risk}/6
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};
