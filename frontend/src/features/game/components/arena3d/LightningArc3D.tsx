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
}

export const LightningArc3D: React.FC<LightningArc3DProps> = ({
  start,
  end,
  color = '#38bdf8',
  intensity = 6,
  segments = 8,
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

  const rodsRef = useRef<Array<{ mesh: Group | null; p1: Vector3; p2: Vector3 }>>([]);

  useFrame(() => {
    if (!groupRef.current) return;
    const vUp = new Vector3(0, 1, 0);

    for (let i = 0; i < segments; i++) {
      const p1 = basePoints[i].clone();
      const p2 = basePoints[i + 1].clone();

      // Add random high-frequency electric jitter to intermediate vertices
      if (i > 0) {
        p1.x += (Math.random() - 0.5) * 0.32;
        p1.y += (Math.random() - 0.5) * 0.32;
        p1.z += (Math.random() - 0.5) * 0.32;
      }
      if (i + 1 < segments) {
        p2.x += (Math.random() - 0.5) * 0.32;
        p2.y += (Math.random() - 0.5) * 0.32;
        p2.z += (Math.random() - 0.5) * 0.32;
      }

      const rod = rodsRef.current[i]?.mesh;
      if (rod) {
        const mid = new Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new Vector3().subVectors(p2, p1);
        const len = dir.length();
        dir.normalize();

        rod.position.copy(mid);
        const quat = new Quaternion().setFromUnitVectors(vUp, dir);
        rod.quaternion.copy(quat);
        rod.scale.set(1, len, 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: segments }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            if (!rodsRef.current[i]) {
              rodsRef.current[i] = {
                mesh: el,
                p1: basePoints[i],
                p2: basePoints[i + 1],
              };
            } else {
              rodsRef.current[i].mesh = el;
            }
          }}
        >
          {/* Inner Glowing White Core */}
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 1, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Outer Electric Plasma Halo */}
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 1, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {/* High-intensity impact flash light */}
      <pointLight position={end} color={color} intensity={intensity} distance={4.5} />
      <pointLight position={start} color={color} intensity={intensity * 0.6} distance={3} />
    </group>
  );
};
