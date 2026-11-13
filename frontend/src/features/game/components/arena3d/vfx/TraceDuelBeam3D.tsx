import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import { Quaternion, Vector3 } from 'three';

import { prefersReducedMotion } from '../hud/motion';

export interface TraceDuelBeam3DProps {
  /** Seat of the operator who called TRACE. */
  from: [number, number, number];
  /** Seat of the operator whose play is being traced. */
  to: [number, number, number];
  startedAtMs: number;
  /** When the verdict lands; the scan pulses faster as it approaches. */
  endsAtMs: number;
}

const BEAM_COLOR = '#f59e0b';
const _up = new Vector3(0, 1, 0);

/**
 * Targeting laser from the accuser's seat to the accused's seat while the traced cards are still
 * face-down, so everyone at the table sees who is checking whom. Pulses run along the beam towards
 * the accused and speed up until the verdict.
 */
export const TraceDuelBeam3D: React.FC<TraceDuelBeam3DProps> = ({
  from,
  to,
  startedAtMs,
  endsAtMs,
}) => {
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const beamMatRef = useRef<MeshBasicMaterial>(null);
  const pulseRefs = useRef<Array<Mesh | null>>([]);
  const targetRingRef = useRef<Group>(null);

  const { mid, length, quaternion, start, dir } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const d = new Vector3().subVectors(b, a);
    const len = d.length();
    const n = d.clone().normalize();
    return {
      mid: new Vector3().addVectors(a, b).multiplyScalar(0.5),
      length: len,
      quaternion: new Quaternion().setFromUnitVectors(_up, n),
      start: a,
      dir: d,
    };
  }, [from, to]);

  useFrame(() => {
    const now = Date.now();
    const span = Math.max(1, endsAtMs - startedAtMs);
    const progress = Math.min(1, Math.max(0, (now - startedAtMs) / span));
    // Accelerating scan: pulse frequency ramps up as the verdict approaches.
    const speed = reducedMotion ? 0 : 0.6 + progress * 2.4;
    const phase = ((now - startedAtMs) / 1000) * speed;

    if (beamMatRef.current) {
      beamMatRef.current.opacity = reducedMotion
        ? 0.7
        : 0.45 + 0.35 * Math.abs(Math.sin(phase * Math.PI * 2));
    }
    pulseRefs.current.forEach((pulse, i) => {
      if (!pulse) return;
      const f = (phase + i / 3) % 1;
      pulse.position.copy(start).addScaledVector(dir, f);
      pulse.visible = !reducedMotion;
    });
    if (targetRingRef.current) {
      targetRingRef.current.rotation.y = reducedMotion ? 0 : now * 0.004;
      targetRingRef.current.scale.setScalar(1 + (reducedMotion ? 0 : 0.12 * Math.sin(now * 0.012)));
    }
  });

  return (
    <group>
      <mesh position={mid} quaternion={quaternion}>
        <cylinderGeometry args={[0.012, 0.012, length, 6]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color={BEAM_COLOR}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            pulseRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshBasicMaterial color="#fde68a" />
        </mesh>
      ))}
      {/* Target lock around the accused operator. */}
      <group ref={targetRingRef} position={to}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.012, 8, 40]} />
          <meshBasicMaterial color={BEAM_COLOR} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};
