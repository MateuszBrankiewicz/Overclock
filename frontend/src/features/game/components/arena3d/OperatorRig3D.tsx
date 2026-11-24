import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef } from 'react';
import type { Group, Material, Mesh, MeshStandardMaterial } from 'three';
import * as THREE from 'three';

import { useI18n } from '../../../../shared/i18n';
import { prefersReducedMotion } from '../../../../shared/lib/motion';
import type { PlayerSeat } from '../../schemas/gameEvents';
import type { CharacterProfile } from '../../utils/characterCatalog';
import { AnchoredHtml } from './AnchoredHtml';
import { computeDeathPose, computeShockPose } from './deathPose';
import { createOperatorVisorTexture } from './operatorVisorTexture';
import { createPcbCardBackTexture } from './pcbCardTexture';
import { emitOverloadSmoke } from './vfx/vfxEmitter';

type Vec3 = [number, number, number];

interface RigBuild {
  /** Shoulder / chest width multiplier. */
  width: number;
  pauldron: number;
  /** How far the dark catalogue armour colour is lifted toward light steel. */
  plateLift: number;
  /** Helmet / faceplate shell. */
  shellColor: string;
  shellMetalness: number;
  shellRoughness: number;
}

const RIG_BUILD: Record<CharacterProfile['visorStyle'], RigBuild> = {
  // GHOST-01: lean netrunner under a matte cloak hood
  matrix: { width: 1, pauldron: 0.9, plateLift: 0.2, shellColor: '#1c2a26', shellMetalness: 0.2, shellRoughness: 0.85 },
  // VOLT-9: broad insulated heavy rig
  tesla: { width: 1.14, pauldron: 1.2, plateLift: 0.3, shellColor: '#8a5a1c', shellMetalness: 0.7, shellRoughness: 0.42 },
  // PROXY-X: slim ceramic android
  dome: { width: 0.93, pauldron: 0.85, plateLift: 0.55, shellColor: '#dbe4ee', shellMetalness: 0.15, shellRoughness: 0.28 },
  // NULL-404: salvaged CRT housing
  crt: { width: 1.02, pauldron: 1, plateLift: 0.22, shellColor: '#4a2f63', shellMetalness: 0.45, shellRoughness: 0.55 },
};

/** Width of the face opening in the GHOST-01 hood, in radians. */
const HOOD_OPENING = 1.9;

const Y_AXIS = new THREE.Vector3(0, 1, 0);
/** Fraction of the shock pose a survivor plays (the overload keeps the full death pose). */
const SURVIVOR_SHOCK_STRENGTH = 0.45;

/** Capsule limb segment stretched between two joints. */
const Limb: React.FC<{ from: Vec3; to: Vec3; radius: number; material: Material }> = ({
  from,
  to,
  radius,
  material,
}) => {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const { mid, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(fx, fy, fz);
    const b = new THREE.Vector3(tx, ty, tz);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [fx, fy, fz, tx, ty, tz]);

  return (
    <mesh position={mid} quaternion={quaternion} material={material} castShadow>
      <capsuleGeometry args={[radius, length, 4, 10]} />
    </mesh>
  );
};

export interface OperatorRig3DProps {
  seat: PlayerSeat;
  character: CharacterProfile;
  position: [number, number, number];
  rotationY: number;
  isActiveTurn: boolean;
  lookTargetAngle?: number;
  isBeingShocked?: boolean;
  isOverloaded?: boolean;
  isWinner?: boolean;
  /** Discharge not yet struck: keep the living look even if the seat is already Eliminated. */
  isStrikePending?: boolean;
  cinematicStartTimeMs?: number | null;
}

export const OperatorRig3D: React.FC<OperatorRig3DProps> = ({
  seat,
  character,
  position,
  rotationY,
  isActiveTurn,
  lookTargetAngle = 0,
  isBeingShocked = false,
  isOverloaded = false,
  isWinner = false,
  isStrikePending = false,
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
  const visorMatRef = useRef<MeshStandardMaterial>(null);

  const isEliminated = (seat.status === 'Eliminated' && !isStrikePending) || isOverloaded;
  const risk = seat.riskLevel ?? 1;
  const visibleCards = Math.min(seat.handCount, 6);

  // Deterministic seed for this operator
  const seed = useMemo(() => {
    return seat.playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  }, [seat.playerId]);

  const initialEliminatedRef = useRef<boolean>(seat.status === 'Eliminated' && !isStrikePending);
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
        isBeingShocked,
        isActiveTurn,
        {
          blackout: t.arena.visorBlackout,
          transmitting: t.arena.visorTransmitting,
          locked: t.arena.visorLocked,
          highVoltage: t.arena.visorHighVoltage,
          synthesis: t.arena.visorSynthesis,
        }
      ),
    [character, isEliminated, isBeingShocked, isActiveTurn, t]
  );
  const cardBackTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const reducedMotion = prefersReducedMotion();

    // 1. Elimination / Death Slam Animation (Flys onto the table desk and falls off!)
    if (isEliminated) {
      let deathElapsed = 5.0; // Default: settled if loaded while already eliminated
      if (!reducedMotion && !initialEliminatedRef.current) {
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
        handFanRef.current.visible = !reducedMotion && deathElapsed < 1.1;
      }
      if (sparkFlashRef.current) {
        sparkFlashRef.current.visible = !reducedMotion && pose.isShockActive;
        if (!reducedMotion && pose.isShockActive) {
          sparkFlashRef.current.scale.setScalar(1 + Math.sin(elapsed * 50) * 0.4);
        }
      }
      if (visorMatRef.current) {
        if (!reducedMotion && deathElapsed < 0.8) {
          visorMatRef.current.emissiveIntensity =
            Math.sin(deathElapsed * 45) > 0 ? 2.4 : 0.05;
        } else {
          visorMatRef.current.emissiveIntensity = 0.05;
        }
      }
      if (!reducedMotion && deathElapsed >= 1.0 && deathElapsed < 3.2) {
        if (Math.random() < 0.16) {
          emitOverloadSmoke([position[0], position[1] + 0.85, position[2] + 0.2]);
        }
      }
      return;
    }

    // 2. Electro-Spasm Shock (Survived voltage test)
    if (isBeingShocked) {
      if (reducedMotion) {
        if (sparkFlashRef.current) sparkFlashRef.current.visible = false;
        if (bodyRef.current) {
          bodyRef.current.position.set(0, 0, 0);
          bodyRef.current.rotation.set(0, 0, 0);
        }
        return;
      }
      let elapsedShock = 0.5;
      const startMs = cinematicStartTimeMs ?? liveStartTimeRef.current;
      if (startMs) {
        elapsedShock = Math.max(0, (Date.now() - startMs) / 1000);
      }
      const pose = computeShockPose(elapsedShock, seed);
      // Surviving the test is a light jolt; the full-strength convulsion belongs to the overload.
      const k = SURVIVOR_SHOCK_STRENGTH;
      if (bodyRef.current) {
        const [px, py, pz] = pose.bodyPosition;
        const [rx, ry, rz] = pose.bodyRotation;
        bodyRef.current.position.set(px * k, py * k, pz * k);
        bodyRef.current.rotation.set(rx * k, ry * k, rz * k);
      }
      if (headRef.current) {
        headRef.current.rotation.x = pose.headRotationX * k;
      }
      if (sparkFlashRef.current) {
        sparkFlashRef.current.visible = pose.isShockActive;
        if (pose.isShockActive) {
          sparkFlashRef.current.scale.setScalar(0.6 + Math.sin(elapsed * 50) * 0.25);
        }
      }
      return;
    }

    // 3. Normal Living Idle / Breathing (waiting for the discharge looks the same)
    if (sparkFlashRef.current) {
      sparkFlashRef.current.visible = false;
    }
    if (handFanRef.current) {
      handFanRef.current.visible = true;
      handFanRef.current.position.y = reducedMotion
        ? 0.92
        : 0.92 + Math.sin(elapsed * (isActiveTurn ? 3.8 : 1.8)) * (isActiveTurn ? 0.035 : 0.012);
    }
    // Waiting for the discharge is calm: the convulsions belong to the strike itself.
    if (bodyRef.current) {
      if (reducedMotion) {
        bodyRef.current.position.set(0, 0, 0);
        bodyRef.current.rotation.set(0, 0, 0);
      } else {
        bodyRef.current.position.set(0, Math.sin(elapsed * 2.1 + position[0]) * 0.025, 0);
        bodyRef.current.rotation.set(0, 0, 0);
      }
    }

    if (headRef.current) {
      if (reducedMotion) {
        headRef.current.rotation.set(0, lookTargetAngle * 0.25, 0);
      } else {
        headRef.current.rotation.x = isActiveTurn ? -0.05 : Math.sin(elapsed * 1.4) * 0.035;
        headRef.current.rotation.y =
          lookTargetAngle * 0.25 + Math.sin(elapsed * (isActiveTurn ? 2.6 : 0.9)) * 0.09;
        headRef.current.rotation.z = 0;
      }
    }

    if (coreRef.current) {
      if (reducedMotion) {
        coreRef.current.rotation.set(0, 0, 0);
      } else {
        coreRef.current.rotation.y = elapsed * (1.4 + risk * 0.65);
        coreRef.current.rotation.x = elapsed * 0.9;
      }
    }

    if (isWinner && visorMatRef.current) {
      visorMatRef.current.emissiveIntensity = 3.2;
    }
  });

  const activeColor = isEliminated
    ? '#3f3f46'
    : isBeingShocked
    ? '#ef4444'
    : character.primaryColor;

  const build = RIG_BUILD[character.visorStyle];
  const w = build.width;
  const trimIntensity = isEliminated ? 0.04 : isBeingShocked ? 2.8 : isActiveTurn ? 2.2 : 1.1;

  const materials = useMemo(() => {
    const dead = new THREE.Color('#2b2b30');
    const plate = new THREE.Color(character.armorColor)
      .lerp(new THREE.Color('#aab4c4'), build.plateLift)
      .lerp(new THREE.Color(character.primaryColor), 0.14);
    const shell = new THREE.Color(build.shellColor);
    if (isEliminated) {
      plate.lerp(dead, 0.75);
      shell.lerp(dead, 0.75);
    }
    return {
      plate: new THREE.MeshStandardMaterial({ color: plate, metalness: 0.62, roughness: 0.4 }),
      shell: new THREE.MeshStandardMaterial({
        color: shell,
        metalness: build.shellMetalness,
        roughness: build.shellRoughness,
      }),
      suit: new THREE.MeshStandardMaterial({ color: '#101116', metalness: 0.25, roughness: 0.78 }),
      steel: new THREE.MeshStandardMaterial({ color: '#4a505c', metalness: 0.9, roughness: 0.32 }),
      leather: new THREE.MeshStandardMaterial({ color: '#17181d', metalness: 0.15, roughness: 0.72 }),
      frame: new THREE.MeshStandardMaterial({ color: '#22252c', metalness: 0.85, roughness: 0.38 }),
    };
  }, [character, build, isEliminated]);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials]
  );

  const trim = (intensityScale = 1) => (
    <meshStandardMaterial
      color="#000000"
      emissive={activeColor}
      emissiveIntensity={trimIntensity * intensityScale}
      toneMapped={false}
    />
  );

  const visorMaterial = (
    <meshStandardMaterial
      ref={visorMatRef}
      map={visorTexture ?? undefined}
      emissiveMap={visorTexture ?? undefined}
      emissive="#ffffff"
      emissiveIntensity={isEliminated ? 0.35 : isBeingShocked ? 2.2 : 1.25}
      roughness={0.15}
      metalness={0.2}
    />
  );

  /** Wrap-around visor screen: a slice of a cylinder centred on the face. */
  const curvedVisor = (radius: number, height: number, arc: number, y: number) => (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={[radius, radius, height, 24, 1, true, -arc / 2, arc]} />
      {visorMaterial}
    </mesh>
  );

  const shoulderX = 0.43 * w;
  const elbow = (side: number): Vec3 => [side * 0.5 * w, 0.85, 0.24];
  const wrist = (side: number): Vec3 => [side * 0.2, 0.9, 0.58];

  return (
    <group ref={rootRef} position={position} rotation={[0, rotationY, 0]}>
      {/* High-back operator chair */}
      <group ref={chairRef} position={[0, 0, -0.32]}>
        <RoundedBox
          args={[0.84, 1.56, 0.1]}
          radius={0.04}
          position={[0, 0.96, 0]}
          material={materials.frame}
          castShadow
          receiveShadow
        />
        <RoundedBox
          args={[0.6, 1.2, 0.07]}
          radius={0.03}
          position={[0, 0.98, 0.05]}
          material={materials.leather}
        />
        {/* Headrest wings */}
        {[-1, 1].map((side) => (
          <RoundedBox
            key={side}
            args={[0.16, 0.42, 0.2]}
            radius={0.04}
            position={[side * 0.39, 1.46, 0.1]}
            rotation={[0, side * -0.4, 0]}
            material={materials.frame}
            castShadow
          />
        ))}
        {/* Status light bar + side strips: the seat itself shows whose turn it is */}
        <mesh position={[0, 1.765, 0.02]}>
          <boxGeometry args={[0.56, 0.035, 0.06]} />
          {trim(isActiveTurn ? 1.6 : 0.7)}
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.36, 0.98, 0.056]}>
            <boxGeometry args={[0.022, 1.16, 0.012]} />
            {trim(0.8)}
          </mesh>
        ))}
        {/* Seat pan + column */}
        <RoundedBox
          args={[0.72, 0.1, 0.62]}
          radius={0.04}
          position={[0, 0.36, 0.32]}
          material={materials.leather}
        />
        <mesh position={[0, 0.16, 0.3]} material={materials.frame}>
          <cylinderGeometry args={[0.07, 0.2, 0.32, 10]} />
        </mesh>
      </group>

      {/* Operator Main Body Group (Can slam onto table and roll off to floor) */}
      <group ref={bodyRef}>
        {/* Abdomen: ribbed under-suit */}
        <RoundedBox
          args={[0.44 * w, 0.4, 0.3]}
          radius={0.08}
          position={[0, 0.5, 0]}
          material={materials.suit}
          castShadow
        />
        {[0.42, 0.52].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
            <torusGeometry args={[0.2 * w, 0.014, 6, 20]} />
          </mesh>
        ))}

        {/* Chest armour */}
        <group position={[0, 0.86, 0]} rotation={[0.07, 0, 0]}>
          <RoundedBox
            args={[0.7 * w, 0.48, 0.42]}
            radius={0.11}
            smoothness={3}
            material={materials.plate}
            castShadow
            receiveShadow
          />
          {/* Sternum plate */}
          <RoundedBox
            args={[0.4 * w, 0.34, 0.06]}
            radius={0.025}
            position={[0, 0.01, 0.2]}
            material={materials.shell}
            castShadow
          />
          {/* Reactor core */}
          <mesh position={[0, 0.07, 0.235]} material={materials.steel}>
            <torusGeometry args={[0.07, 0.016, 8, 24]} />
          </mesh>
          <mesh position={[0, 0.07, 0.236]}>
            <circleGeometry args={[0.056, 20]} />
            {trim(1.3)}
          </mesh>
          {/* Capacitor risk pips: one lit per risk level */}
          {Array.from({ length: 6 }).map((_, i) => {
            const lit = !isEliminated && i < risk;
            const pipColor = i >= 4 ? '#ef4444' : i >= 2 ? '#f59e0b' : '#34d399';
            return (
              <mesh key={i} position={[(i - 2.5) * 0.052 * w, -0.085, 0.233]}>
                <boxGeometry args={[0.034, 0.05, 0.012]} />
                <meshStandardMaterial
                  color={lit ? '#000000' : '#1f2228'}
                  emissive={lit ? pipColor : '#000000'}
                  emissiveIntensity={lit ? (isBeingShocked ? 3 : 1.9) : 0}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
          {/* Shoulder seam trims */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.25 * w, 0.02, 0.212]} rotation={[0, 0, side * 0.22]}>
              <boxGeometry args={[0.022, 0.36, 0.012]} />
              {trim(0.85)}
            </mesh>
          ))}
        </group>

        {/* Neck */}
        <mesh position={[0, 1.13, 0.01]} material={materials.suit}>
          <cylinderGeometry args={[0.085, 0.11, 0.16, 12]} />
        </mesh>
        <mesh position={[0, 1.1, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
          <torusGeometry args={[0.115, 0.022, 8, 20]} />
        </mesh>

        {/* Arms: shoulders, pauldrons, forearms resting on the table rail, gloved hands */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * shoulderX, 1.0, 0]} material={materials.steel} castShadow>
              <sphereGeometry args={[0.115, 14, 10]} />
            </mesh>
            <RoundedBox
              args={[0.27 * build.pauldron, 0.13, 0.36 * build.pauldron]}
              radius={0.05}
              position={[side * (shoulderX + 0.04), 1.09, 0]}
              rotation={[0, 0, side * -0.32]}
              material={materials.plate}
              castShadow
            />
            <mesh position={[side * (shoulderX + 0.13), 1.07, 0]} rotation={[0, 0, side * -0.32]}>
              <boxGeometry args={[0.014, 0.05, 0.3 * build.pauldron]} />
              {trim(0.8)}
            </mesh>
            <Limb from={[side * shoulderX, 0.98, 0]} to={elbow(side)} radius={0.07} material={materials.suit} />
            <mesh position={elbow(side)} material={materials.steel}>
              <sphereGeometry args={[0.075, 12, 8]} />
            </mesh>
            <Limb from={elbow(side)} to={wrist(side)} radius={0.062} material={materials.plate} />
            <RoundedBox
              args={[0.11, 0.075, 0.13]}
              radius={0.03}
              position={[side * 0.17, 0.905, 0.64]}
              rotation={[-0.2, side * -0.35, 0]}
              material={materials.suit}
              castShadow
            />
            <mesh position={[side * 0.17, 0.945, 0.64]} rotation={[-0.2, side * -0.35, 0]}>
              <boxGeometry args={[0.07, 0.008, 0.05]} />
              {trim(0.7)}
            </mesh>

            {/* VOLT-9: shoulder Tesla coils that glow hotter as the capacitor risk climbs */}
            {character.visorStyle === 'tesla' && (
              <group position={[side * (shoulderX + 0.07), 1.17, -0.02]}>
                <mesh position={[0, 0.1, 0]} material={materials.steel}>
                  <cylinderGeometry args={[0.028, 0.04, 0.22, 10]} />
                </mesh>
                {[0.04, 0.1, 0.16].map((y) => (
                  <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.062, 0.015, 8, 18]} />
                    <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.3} />
                  </mesh>
                ))}
                <mesh position={[0, 0.25, 0]}>
                  <sphereGeometry args={[0.05, 12, 10]} />
                  <meshStandardMaterial
                    color="#000000"
                    emissive={risk >= 4 ? '#ef4444' : activeColor}
                    emissiveIntensity={isEliminated ? 0 : isBeingShocked ? 3.2 : 0.7 + risk * 0.45}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            )}
          </group>
        ))}

        {/* Head: one distinct silhouette per Cyber-Rig archetype */}
        <group ref={headRef} position={[0, 1.32, 0.06]}>
          {character.visorStyle === 'matrix' && (
            <>
              <mesh scale={[1, 1.08, 1.04]} material={materials.suit} castShadow>
                <sphereGeometry args={[0.2, 20, 16]} />
              </mesh>
              {/* Thermal-cloak hood, open at the face */}
              <mesh position={[0, 0.03, -0.03]} scale={[1, 1.14, 1.1]} castShadow>
                <sphereGeometry
                  args={[0.265, 24, 16, Math.PI / 2 + HOOD_OPENING / 2, Math.PI * 2 - HOOD_OPENING]}
                />
                <meshStandardMaterial
                  color={materials.shell.color}
                  metalness={0.2}
                  roughness={0.85}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, 0.305, 0.02]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.03, 0.02, 0.3]} />
                {trim(0.8)}
              </mesh>
              {curvedVisor(0.208, 0.15, 1.9, 0.02)}
              <RoundedBox
                args={[0.2, 0.09, 0.12]}
                radius={0.03}
                position={[0, -0.15, 0.13]}
                material={materials.plate}
              />
            </>
          )}

          {character.visorStyle === 'tesla' && (
            <>
              <mesh material={materials.shell} castShadow>
                <cylinderGeometry args={[0.235, 0.25, 0.34, 20]} />
              </mesh>
              <mesh position={[0, 0.17, 0]} material={materials.shell} castShadow>
                <sphereGeometry args={[0.235, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <RoundedBox
                args={[0.5, 0.07, 0.2]}
                radius={0.025}
                position={[0, 0.115, 0.17]}
                material={materials.plate}
                castShadow
              />
              {curvedVisor(0.252, 0.13, 1.7, 0.02)}
              {/* Respirator + side filters */}
              <mesh position={[0, -0.13, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
                <cylinderGeometry args={[0.085, 0.1, 0.14, 14]} />
              </mesh>
              {[-1, 1].map((side) => (
                <React.Fragment key={side}>
                  <mesh
                    position={[side * 0.17, -0.13, 0.14]}
                    rotation={[Math.PI / 2, 0, side * -0.6]}
                    material={materials.steel}
                  >
                    <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
                  </mesh>
                  <mesh position={[side * 0.255, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.steel}>
                    <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
                  </mesh>
                </React.Fragment>
              ))}
              <mesh position={[0, 0.3, -0.02]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.05, 0.02, 0.34]} />
                {trim(0.9)}
              </mesh>
            </>
          )}

          {character.visorStyle === 'dome' && (
            <>
              <mesh scale={[0.96, 1.1, 1]} material={materials.shell} castShadow>
                <sphereGeometry args={[0.21, 24, 18]} />
              </mesh>
              {curvedVisor(0.212, 0.14, 1.8, 0.0)}
              <RoundedBox
                args={[0.16, 0.07, 0.1]}
                radius={0.03}
                position={[0, -0.17, 0.11]}
                material={materials.plate}
              />
              {/* Cranial dome with the exposed quantum core */}
              <group position={[0, 0.2, -0.01]}>
                <mesh>
                  <sphereGeometry args={[0.17, 20, 14]} />
                  <meshStandardMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.28}
                    metalness={0.1}
                    roughness={0.05}
                    depthWrite={false}
                  />
                </mesh>
                <mesh ref={coreRef}>
                  <octahedronGeometry args={[0.085, 0]} />
                  <meshStandardMaterial
                    color="#000000"
                    emissive={activeColor}
                    emissiveIntensity={isEliminated ? 0 : 2.2}
                    toneMapped={false}
                    wireframe
                  />
                </mesh>
                <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
                  <torusGeometry args={[0.165, 0.014, 8, 28]} />
                </mesh>
              </group>
              {/* Cryo-cooling conduits from the skull into the collar */}
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.13, -0.12, -0.1]} rotation={[0.3, side * 0.5, 0]}>
                  <torusGeometry args={[0.13, 0.016, 8, 16, Math.PI]} />
                  {trim(0.55)}
                </mesh>
              ))}
            </>
          )}

          {character.visorStyle === 'crt' && (
            <group rotation={[0, 0, 0.07]}>
              <RoundedBox
                args={[0.54, 0.42, 0.34]}
                radius={0.05}
                smoothness={3}
                material={materials.shell}
                castShadow
              />
              {/* Tube housing tapering out of the back */}
              <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]} material={materials.plate}>
                <cylinderGeometry args={[0.11, 0.19, 0.18, 4]} />
              </mesh>
              {/* Recessed bezel + flat CRT glass */}
              <mesh position={[-0.03, 0.01, 0.171]} material={materials.suit}>
                <planeGeometry args={[0.44, 0.32]} />
              </mesh>
              <mesh position={[-0.03, 0.01, 0.174]}>
                <planeGeometry args={[0.4, 0.26]} />
                {visorMaterial}
              </mesh>
              {/* Control knobs + crimson optic lens */}
              {[0.09, -0.01].map((y) => (
                <mesh key={y} position={[0.225, y, 0.18]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
                  <cylinderGeometry args={[0.022, 0.022, 0.03, 10]} />
                </mesh>
              ))}
              <mesh position={[0.225, -0.11, 0.18]}>
                <sphereGeometry args={[0.026, 10, 8]} />
                <meshStandardMaterial
                  color="#000000"
                  emissive="#ef4444"
                  emissiveIntensity={isEliminated ? 0 : 2.6}
                  toneMapped={false}
                />
              </mesh>
              {/* Bent antenna */}
              <mesh position={[0.17, 0.33, -0.06]} rotation={[0, 0, -0.35]} material={materials.steel}>
                <cylinderGeometry args={[0.008, 0.012, 0.3, 6]} />
              </mesh>
              <mesh position={[0.222, 0.47, -0.06]}>
                <sphereGeometry args={[0.022, 8, 6]} />
                {trim(1.4)}
              </mesh>
              {/* Loose signal cable into the collar */}
              <mesh position={[-0.19, -0.24, -0.04]} rotation={[0.2, 0.3, 0.4]} material={materials.suit}>
                <torusGeometry args={[0.1, 0.014, 6, 14, Math.PI]} />
              </mesh>
            </group>
          )}
        </group>

        {/* Fanned PCB cards held in both hands (only while alive) */}
        {!isEliminated && visibleCards > 0 && (
          <group ref={handFanRef} position={[0, 0.92, 0.62]}>
            {Array.from({ length: visibleCards }).map((_, i) => {
              const spread = (i - (visibleCards - 1) / 2) * 0.1;
              return (
                <mesh
                  key={i}
                  position={[spread, 0.07 + Math.abs(spread) * -0.12, i * 0.008]}
                  rotation={[-0.2, 0, -spread * 1.1]}
                  castShadow
                >
                  <boxGeometry args={[0.2, 0.28, 0.01]} />
                  <meshStandardMaterial
                    map={cardBackTexture ?? undefined}
                    color="#ffffff"
                    metalness={0.35}
                    roughness={0.4}
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
        <AnchoredHtml position={[0, 1.04, 0.86]} center distanceFactor={6.2} zIndexRange={[10, 0]}>
          <div
            className={clsx(
              'px-2 py-0.5 rounded-md border font-mono text-[9px] whitespace-nowrap backdrop-blur-md transition-all select-none pointer-events-none shadow-md',
              isBeingShocked
                ? 'bg-red-950/95 border-red-500 text-red-100 motion-safe:animate-pulse'
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
        </AnchoredHtml>
      )}
    </group>
  );
};
