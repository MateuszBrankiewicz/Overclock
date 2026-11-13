import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { getTableFloorGlowTexture, getTableSurfaceTextures } from './tableSurfaceTexture';

export interface BunkerTable3DProps {
  /** Stage accent (protocol / phase colour): tints the traces, the rim LED and the floor glow. */
  accentColor: string;
}

/** Top of the playing surface: cards, the drum and the risk bank all sit on this plane. */
export const TABLE_SURFACE_Y = 0.765;

/** Turns the octagon so a flat edge (not a corner) faces every operator. */
const FLAT_EDGE_TURN = Math.PI / 8;

/** Seed colour only: every accent material eases toward `accentColor` each frame. */
const INITIAL_ACCENT = '#10b981';

/** Cross-section of the armoured rail around the mat, as [radius, height]. */
const RAIL_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [1.9, 0.6],
  [2.18, 0.6],
  [2.3, 0.665],
  [2.3, 0.735],
  [2.25, 0.79],
  [2.03, 0.79],
  [1.985, TABLE_SURFACE_Y - 0.004],
];

/**
 * The bunker operating table: octagonal dielectric mat with live circuit traces, an armoured
 * rail, an accent LED seam and a pedestal. Purely visual, shared by the arena and the lobby.
 */
export const BunkerTable3D: React.FC<BunkerTable3DProps> = ({ accentColor }) => {
  const surface = useMemo(() => getTableSurfaceTextures(), []);
  const floorGlow = useMemo(() => getTableFloorGlowTexture(), []);
  const targetColor = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  const railGeometry = useMemo(
    () =>
      new THREE.LatheGeometry(
        RAIL_PROFILE.map(([radius, height]) => new THREE.Vector2(radius, height)),
        8
      ),
    []
  );

  const materials = useMemo(
    () => ({
      mat: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: surface?.albedo ?? null,
        emissiveMap: surface?.emissive ?? null,
        emissive: new THREE.Color(INITIAL_ACCENT),
        emissiveIntensity: 1.25,
        roughness: 0.62,
        metalness: 0.3,
      }),
      led: new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: new THREE.Color(INITIAL_ACCENT),
        emissiveIntensity: 2.4,
        toneMapped: false,
      }),
      floorGlow: new THREE.MeshBasicMaterial({
        color: new THREE.Color(INITIAL_ACCENT),
        map: floorGlow,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [surface, floorGlow]
  );

  useEffect(
    () => () => {
      railGeometry.dispose();
      materials.mat.dispose();
      materials.led.dispose();
      materials.floorGlow.dispose();
    },
    [railGeometry, materials]
  );

  useFrame((_state, delta) => {
    const step = Math.min(1, delta * 3.5);
    materials.mat.emissive.lerp(targetColor, step);
    materials.led.emissive.lerp(targetColor, step);
    materials.floorGlow.color.lerp(targetColor, step);
  });

  return (
    <group>
      {/* LED spill on the concrete around the table */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.floorGlow}>
        <planeGeometry args={[7.4, 7.4]} />
      </mesh>

      <group rotation={[0, FLAT_EDGE_TURN, 0]}>
        {/* Armoured rail */}
        <mesh geometry={railGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color="#23272f"
            metalness={0.82}
            roughness={0.42}
            flatShading
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Dielectric mat with circuit traces */}
        <mesh
          position={[0, TABLE_SURFACE_Y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={materials.mat}
          receiveShadow
        >
          <circleGeometry args={[1.99, 8]} />
        </mesh>

        {/* LED seam between mat and rail */}
        <mesh
          position={[0, TABLE_SURFACE_Y + 0.003, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={materials.led}
        >
          <ringGeometry args={[1.955, 1.985, 8, 1]} />
        </mesh>

        {/* LED strip under the rail lip */}
        <mesh position={[0, 0.588, 0]} material={materials.led}>
          <cylinderGeometry args={[2.12, 2.12, 0.018, 8, 1, true]} />
        </mesh>

        {/* Underframe */}
        <mesh position={[0, 0.53, 0]} castShadow>
          <cylinderGeometry args={[1.92, 0.72, 0.14, 8]} />
          <meshStandardMaterial color="#14161b" metalness={0.75} roughness={0.5} flatShading />
        </mesh>

        {/* Pedestal column */}
        <mesh position={[0, 0.27, 0]} castShadow>
          <cylinderGeometry args={[0.46, 0.56, 0.42, 8]} />
          <meshStandardMaterial color="#1b1e24" metalness={0.8} roughness={0.4} flatShading />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={materials.led}>
          <cylinderGeometry args={[0.525, 0.525, 0.02, 8, 1, true]} />
        </mesh>

        {/* Floor plate */}
        <mesh position={[0, 0.035, 0]} receiveShadow>
          <cylinderGeometry args={[0.95, 1.08, 0.07, 8]} />
          <meshStandardMaterial color="#101216" metalness={0.8} roughness={0.5} flatShading />
        </mesh>
      </group>
    </group>
  );
};
