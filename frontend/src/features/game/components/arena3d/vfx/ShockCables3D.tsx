import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
  TubeGeometry,
  Vector3,
} from 'three';

import { prefersReducedMotion } from '../../../../../shared/lib/motion';
import { LightningArc3D } from '../LightningArc3D';
import { shockCablePaths, shockCableState, type Vec3 } from './shockCables';

export interface ShockCables3DProps {
  /** Chest of the tested operator: where both leads clamp on. */
  target: Vec3;
  /** Discharge start (the capacitor starts charging); null while the cables are only armed. */
  chargeStartedAtMs: number | null;
  /** When the current hits the operator; null while armed. */
  strikeAtMs: number | null;
  /** Only read after the strike: heavy surge on overload, light jolt otherwise. */
  overloaded: boolean;
}

const ARMED_COLOR = new Color('#f59e0b');
const HOT_COLOR = new Color('#fff7ed');
const LIGHT_SHOCK_COLOR = new Color('#38bdf8');
const HEAVY_SHOCK_COLOR = new Color('#ef4444');
const PULSES_PER_CABLE = 3;

interface CableProps {
  points: [Vec3, Vec3, Vec3];
  index: number;
  target: Vec3;
  chargeStartedAtMs: number | null;
  strikeAtMs: number | null;
  overloaded: boolean;
  reducedMotion: boolean;
}

const Cable: React.FC<CableProps> = ({
  points,
  index,
  target,
  chargeStartedAtMs,
  strikeAtMs,
  overloaded,
  reducedMotion,
}) => {
  const glowRef = useRef<MeshStandardMaterial>(null);
  const pulseRefs = useRef<Array<Mesh | null>>([]);
  const pulseMatRefs = useRef<Array<MeshBasicMaterial | null>>([]);
  const arcRef = useRef<Group>(null);
  const scratch = useMemo(() => ({ color: new Color(), point: new Vector3() }), []);

  const { curve, geometry } = useMemo(() => {
    const c = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    return { curve: c, geometry: new TubeGeometry(c, 28, 0.02, 6, false) };
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const clampEnd = points[2];

  useFrame(() => {
    const now = Date.now();
    const state = shockCableState(now, chargeStartedAtMs, strikeAtMs, overloaded);
    const struck = state.sinceStrikeMs !== null;
    const flicker = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(now * 0.06 + index * 2.1);

    // Cable glow: dim amber when armed, white-hot while charging, then the strike colour.
    const color = scratch.color;
    let intensity: number;
    if (!struck) {
      color.copy(ARMED_COLOR).lerp(HOT_COLOR, state.charge * 0.6);
      intensity = 0.6 + state.charge * 2.4 * flicker;
    } else if (state.shock > 0) {
      color.copy(overloaded ? HEAVY_SHOCK_COLOR : LIGHT_SHOCK_COLOR);
      intensity = 1 + state.shock * 5 * (reducedMotion ? 1 : 0.5 + Math.random() * 0.5);
    } else {
      // Burnt out after an overload; a calm hum when the insulation held.
      color.copy(overloaded ? HEAVY_SHOCK_COLOR : ARMED_COLOR);
      intensity = overloaded ? 0.15 : 0.4;
    }
    if (glowRef.current) {
      glowRef.current.emissive.copy(color);
      glowRef.current.emissiveIntensity = intensity;
    }

    // Current pulses run from the rim to the operator, faster as the capacitor charges.
    const speed = struck ? 0 : 0.35 + state.charge * 2.6;
    for (let i = 0; i < PULSES_PER_CABLE; i++) {
      const pulse = pulseRefs.current[i];
      const mat = pulseMatRefs.current[i];
      if (!pulse || !mat) continue;
      const visible = !reducedMotion && !struck;
      pulse.visible = visible;
      if (!visible) continue;
      const t = ((now / 1000) * speed + i / PULSES_PER_CABLE + index * 0.17) % 1;
      curve.getPointAt(t, scratch.point);
      pulse.position.copy(scratch.point);
      pulse.scale.setScalar(0.8 + state.charge * 0.9);
      mat.color.copy(color);
    }

    // Arcs jump from the clamp into the body only while the strike flash lasts.
    if (arcRef.current) {
      arcRef.current.visible =
        !reducedMotion && state.shock > 0 && (overloaded || Math.random() > 0.35);
    }
  });

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          ref={glowRef}
          color="#111113"
          roughness={0.5}
          metalness={0.2}
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Clamp on the operator's shoulder. */}
      <mesh position={clampEnd}>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: PULSES_PER_CABLE }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            pulseRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial
            ref={(el) => {
              pulseMatRefs.current[i] = el;
            }}
            color="#f59e0b"
            toneMapped={false}
          />
        </mesh>
      ))}
      <group ref={arcRef} visible={false}>
        <LightningArc3D
          start={clampEnd}
          end={target}
          segments={4}
          jitter={overloaded ? 0.12 : 0.05}
          thickness={overloaded ? 0.7 : 0.35}
          color={overloaded ? '#ef4444' : '#38bdf8'}
          intensity={overloaded ? 3 : 0.8}
        />
      </group>
    </group>
  );
};

/**
 * Voltage-test leads: two live cables from the table rim to the tested operator. They stay out of
 * the table centre, so they never hide anybody, and their strike flash scales with the outcome.
 */
export const ShockCables3D: React.FC<ShockCables3DProps> = ({
  target,
  chargeStartedAtMs,
  strikeAtMs,
  overloaded,
}) => {
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const lightRef = useRef<PointLight>(null);
  const paths = useMemo(() => shockCablePaths(target), [target]);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const state = shockCableState(Date.now(), chargeStartedAtMs, strikeAtMs, overloaded);
    if (state.shock > 0) {
      light.color.copy(overloaded ? HEAVY_SHOCK_COLOR : LIGHT_SHOCK_COLOR);
      const flicker = reducedMotion ? 1 : 0.4 + Math.random() * 0.6;
      light.intensity = state.shock * (overloaded ? 12 : 6) * flicker;
    } else if (state.sinceStrikeMs === null) {
      light.color.copy(ARMED_COLOR);
      light.intensity = state.charge * 2.5;
    } else {
      light.intensity = 0;
    }
  });

  return (
    <group>
      {paths.map((path, i) => (
        <Cable
          key={i}
          index={i}
          points={path.points}
          target={target}
          chargeStartedAtMs={chargeStartedAtMs}
          strikeAtMs={strikeAtMs}
          overloaded={overloaded}
          reducedMotion={reducedMotion}
        />
      ))}
      <pointLight ref={lightRef} position={target} intensity={0} distance={3.5} />
    </group>
  );
};
