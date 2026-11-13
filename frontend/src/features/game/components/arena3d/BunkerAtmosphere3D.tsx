import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { prefersReducedMotion } from './hud/motion';

export interface BunkerAtmosphere3DProps {
  accentColor?: string;
}

const DUST_COUNT = 150;

export const BunkerAtmosphere3D: React.FC<BunkerAtmosphere3DProps> = ({
  accentColor = '#10b981',
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const coneMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetColor = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  // Scatter 150 dust motes throughout the overhead lamp's conical beam volume
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const vel = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const height = 0.8 + ((i * 31) % 2.8);
      // Conical spread: wider near table, tighter near lamp
      const spread = 0.2 + (3.6 - height) * 0.42;
      const radius = (((i * 47) % 100) / 100) * spread;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      vel[i] = 0.04 + ((i * 13) % 40) * 0.0015;
    }
    return [pos, vel];
  }, []);

  useFrame((_state, delta) => {
    // Smoothly transition volumetric cone color to match active phase
    if (coneMaterialRef.current) {
      coneMaterialRef.current.color.lerp(targetColor, delta * 3.5);
    }

    if (prefersReducedMotion() || !pointsRef.current) {
      return;
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;

    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      const idx = i * 3 + 1;
      let y = arr[idx] ?? 2.0;
      y -= delta * (velocities[i] ?? 0.05);

      // Wrap floating dust particles back near lamp top
      if (y < 0.78) {
        y = 3.6;
      }
      arr[idx] = y;

      // Gentle lateral drift
      const xIdx = i * 3;
      arr[xIdx] = (arr[xIdx] ?? 0) + Math.sin(y * 4 + i) * delta * 0.02;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Volumetric Lamp Light Cone with smooth transparency */}
      <mesh position={[0, 2.25, 0]}>
        <coneGeometry args={[1.85, 3.2, 24, 1, true]} />
        <meshBasicMaterial
          ref={coneMaterialRef}
          color={accentColor}
          transparent
          opacity={0.065}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Dust Particles suspended in the light beam */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.028}
          color="#d4d4d8"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Bunker Room Shell: dark concrete walls preventing void behind server racks */}
      {/* Back Wall */}
      <mesh position={[0, 2.5, -5.6]} receiveShadow>
        <planeGeometry args={[18, 5.2]} />
        <meshStandardMaterial color="#08080b" roughness={0.94} metalness={0.08} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-6.8, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[14, 5.2]} />
        <meshStandardMaterial color="#08080b" roughness={0.94} metalness={0.08} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[6.8, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[14, 5.2]} />
        <meshStandardMaterial color="#08080b" roughness={0.94} metalness={0.08} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 4.88, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#060608" roughness={0.96} metalness={0.05} />
      </mesh>

      {/* Overhead Industrial Pipes and Cable Conduits running along the ceiling */}
      <mesh position={[0, 4.62, -2.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 16, 12]} />
        <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh position={[0, 4.68, -3.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 16, 12]} />
        <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.32} />
      </mesh>
      <mesh position={[-2.8, 4.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 14, 8]} />
        <meshStandardMaterial color="#09090b" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Lamp suspension cable connected directly to the ceiling */}
      <mesh position={[0, 4.36, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.05, 8]} />
        <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
};
