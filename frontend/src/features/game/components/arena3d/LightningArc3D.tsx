import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { Quaternion, Vector3 } from 'three';

export interface LightningArc3DProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  intensity?: number;
  segments?: number;
  /** Random displacement of the bolt's inner vertices; short arcs need a small one. */
  jitter?: number;
  /** Width multiplier of the bolt's core and halo. */
  thickness?: number;
}

// Module-scoped scratch objects to avoid any allocations in useFrame
const _scratchP1 = new Vector3();
const _scratchP2 = new Vector3();
const _scratchMid = new Vector3();
const _scratchDir = new Vector3();
const _scratchQuat = new Quaternion();
const _vUp = new Vector3(0, 1, 0);

export const LightningArc3D: React.FC<LightningArc3DProps> = ({
  start,
  end,
  color = '#38bdf8',
  intensity = 6,
  segments = 8,
  jitter = 0.32,
  thickness = 1,
}) => {
  const groupRef = useRef<Group>(null);

  const basePoints = useMemo(() => {
    const pts: Vector3[] = [];
    const vStart = new Vector3(...start);
    const vEnd = new Vector3(...end);
    for (let i = 0; i <= segments; i++) {
      const alpha = i / segments;
      pts.push(new Vector3().lerpVectors(vStart, vEnd, alpha));
    }
    return pts;
  }, [start, end, segments]);

  const rodsRef = useRef<Array<{ mesh: Group | null }>>([]);
  const branchRodsRef = useRef<Array<{ mesh: Group | null }>>([]);

  useFrame(() => {
    if (!groupRef.current) return;

    // 1. Update main trunk segments
    for (let i = 0; i < segments; i++) {
      _scratchP1.copy(basePoints[i]);
      _scratchP2.copy(basePoints[i + 1]);

      // Add random high-frequency electric jitter to intermediate vertices
      if (i > 0) {
        _scratchP1.x += (Math.random() - 0.5) * jitter;
        _scratchP1.y += (Math.random() - 0.5) * jitter;
        _scratchP1.z += (Math.random() - 0.5) * jitter;
      }
      if (i + 1 < segments) {
        _scratchP2.x += (Math.random() - 0.5) * jitter;
        _scratchP2.y += (Math.random() - 0.5) * jitter;
        _scratchP2.z += (Math.random() - 0.5) * jitter;
      }

      const rod = rodsRef.current[i]?.mesh;
      if (rod) {
        _scratchMid.addVectors(_scratchP1, _scratchP2).multiplyScalar(0.5);
        _scratchDir.subVectors(_scratchP2, _scratchP1);
        const len = _scratchDir.length();
        _scratchDir.normalize();

        rod.position.copy(_scratchMid);
        _scratchQuat.setFromUnitVectors(_vUp, _scratchDir);
        rod.quaternion.copy(_scratchQuat);
        rod.scale.set(thickness, len, thickness);
      }
    }

    // 2. Update 2 electric branching forks (branching off trunk points 2 and 5)
    const branchIndices = [Math.floor(segments * 0.3), Math.floor(segments * 0.65)];
    for (let b = 0; b < branchIndices.length; b++) {
      const idx = branchIndices[b];
      const rod = branchRodsRef.current[b]?.mesh;
      if (rod && basePoints[idx]) {
        _scratchP1.copy(basePoints[idx]);
        _scratchP2.copy(_scratchP1);
        const sign = b === 0 ? 1 : -1;
        const reach = Math.min(1, jitter / 0.32);
        _scratchP2.x += sign * (0.35 + (Math.random() - 0.5) * 0.25) * reach;
        _scratchP2.y += (Math.random() - 0.5) * 0.3 * reach;
        _scratchP2.z += (Math.random() - 0.5) * 0.25 * reach;

        _scratchMid.addVectors(_scratchP1, _scratchP2).multiplyScalar(0.5);
        _scratchDir.subVectors(_scratchP2, _scratchP1);
        const len = _scratchDir.length();
        _scratchDir.normalize();

        rod.position.copy(_scratchMid);
        _scratchQuat.setFromUnitVectors(_vUp, _scratchDir);
        rod.quaternion.copy(_scratchQuat);
        rod.scale.set(thickness, len, thickness);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main lightning trunk with thickened core */}
      {Array.from({ length: segments }).map((_, i) => (
        <group
          key={`trunk-${i}`}
          ref={(el) => {
            if (!rodsRef.current[i]) {
              rodsRef.current[i] = { mesh: el };
            } else {
              rodsRef.current[i].mesh = el;
            }
          }}
        >
          {/* Inner Glowing White Core */}
          <mesh>
            <cylinderGeometry args={[0.042, 0.042, 1, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Outer Electric Plasma Halo */}
          <mesh>
            <cylinderGeometry args={[0.11, 0.11, 1, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {/* 2 Electric Branch Forks */}
      {[0, 1].map((b) => (
        <group
          key={`branch-${b}`}
          ref={(el) => {
            if (!branchRodsRef.current[b]) {
              branchRodsRef.current[b] = { mesh: el };
            } else {
              branchRodsRef.current[b].mesh = el;
            }
          }}
        >
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 1, 5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 1, 5]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* High-intensity impact flash light */}
      <pointLight position={end} color={color} intensity={intensity} distance={4.5} />
      <pointLight position={start} color={color} intensity={intensity * 0.6} distance={3} />
    </group>
  );
};
