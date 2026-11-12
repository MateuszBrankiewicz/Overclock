import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { prefersReducedMotion } from './hud/motion';

export interface ServerRackDiodes3DProps {
  isBluffCheck?: boolean;
  isVoltageTest?: boolean;
  stageAccentColor?: string;
}

const RACK_X_POSITIONS = [-3.8, -1.9, 1.9, 3.8];
const COLS = 4;
const ROWS = 8;
const TOTAL_DIODES = RACK_X_POSITIONS.length * COLS * ROWS; // 128 diodes

export const ServerRackDiodes3D: React.FC<ServerRackDiodes3DProps> = ({
  isBluffCheck = false,
  isVoltageTest = false,
  stageAccentColor = '#10b981',
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const diodeParams = useMemo(() => {
    return Array.from({ length: TOTAL_DIODES }).map((_, i) => ({
      speed: 2.5 + ((i * 17) % 15) * 0.4,
      phase: ((i * 43) % 100) * 0.0628,
      baseColor: (i % 3 === 0) ? '#06b6d4' : (i % 5 === 0) ? '#f59e0b' : stageAccentColor,
    }));
  }, [stageAccentColor]);

  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const dummyColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    let idx = 0;

    for (const rx of RACK_X_POSITIONS) {
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const dx = (c - (COLS - 1) / 2) * 0.16;
          const dy = 1.5 + (r - (ROWS - 1) / 2) * 0.18;
          dummyMatrix.setPosition(rx + dx, dy, -4.04);
          mesh.setMatrixAt(idx, dummyMatrix);
          mesh.setColorAt(idx, dummyColor.set('#042f2e'));
          idx++;
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [dummyMatrix, dummyColor]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const elapsed = clock.getElapsedTime();
    const reducedMotion = prefersReducedMotion();

    for (let i = 0; i < TOTAL_DIODES; i++) {
      if (isBluffCheck) {
        dummyColor.set('#ef4444');
      } else if (isVoltageTest) {
        const pulse = Math.sin(elapsed * 22 + i) > 0;
        dummyColor.set(pulse ? '#f59e0b' : '#3f1f04');
      } else if (reducedMotion) {
        dummyColor.set(diodeParams[i]?.baseColor ?? stageAccentColor);
      } else {
        const p = diodeParams[i] ?? { speed: 3, phase: 0, baseColor: stageAccentColor };
        const isOn = Math.sin(elapsed * p.speed + p.phase) > 0.15;
        dummyColor.set(isOn ? p.baseColor : '#09090b');
      }
      mesh.setColorAt(i, dummyColor);
    }

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TOTAL_DIODES]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[0.045, 0.045, 0.02]} />
      <meshStandardMaterial
        metalness={0.2}
        roughness={0.15}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
