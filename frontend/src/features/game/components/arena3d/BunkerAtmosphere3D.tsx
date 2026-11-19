import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import { getBunkerWallTexture, getDustSpriteTexture } from './bunkerWallTexture';

export interface BunkerAtmosphere3DProps {
  accentColor?: string;
}

const DUST_COUNT = 110;
const INITIAL_ACCENT = '#10b981';
const FAN_BLADES = 7;

const CONE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Brightest at the lamp, fading toward the table, and feathered at the silhouette so the beam
// reads as haze instead of a hard-edged wedge.
const CONE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float feather = smoothstep(0.0, 0.85, facing);
    float falloff = pow(clamp(vUv.y, 0.0, 1.0), 2.2);
    gl_FragColor = vec4(uColor * feather * falloff * uStrength, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const BunkerAtmosphere3D: React.FC<BunkerAtmosphere3DProps> = ({
  accentColor = INITIAL_ACCENT,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const fanRef = useRef<THREE.Group>(null);
  const targetColor = useMemo(() => new THREE.Color(accentColor), [accentColor]);
  // The beam stays mostly tungsten-white so it does not flood the room with the accent colour.
  const beamColor = useMemo(
    () => new THREE.Color('#ffe2bd').lerp(new THREE.Color(accentColor), 0.45),
    [accentColor]
  );
  // Fan backlight: a dimmed accent so the bloom pass leaves it as a soft halo.
  const fanGlowColor = useMemo(
    () => new THREE.Color(accentColor).multiplyScalar(0.3),
    [accentColor]
  );
  const wallTexture = useMemo(() => getBunkerWallTexture(), []);
  const dustSprite = useMemo(() => getDustSpriteTexture(), []);

  const materials = useMemo(
    () => ({
      cone: new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(INITIAL_ACCENT) },
          uStrength: { value: 0.085 },
        },
        vertexShader: CONE_VERTEX_SHADER,
        fragmentShader: CONE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
      led: new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: new THREE.Color(INITIAL_ACCENT),
        emissiveIntensity: 2.2,
        toneMapped: false,
      }),
      fanGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(INITIAL_ACCENT) }),
      wall: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: wallTexture,
        roughness: 0.9,
        metalness: 0.1,
      }),
      steel: new THREE.MeshStandardMaterial({ color: '#1c1f26', metalness: 0.85, roughness: 0.4 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: '#0d0e12', metalness: 0.8, roughness: 0.5 }),
    }),
    [wallTexture]
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials]
  );

  // Dust motes suspended in the overhead lamp's conical beam volume
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
    const step = Math.min(1, delta * 3.5);
    const coneColor: unknown = materials.cone.uniforms.uColor?.value;
    if (coneColor instanceof THREE.Color) {
      coneColor.lerp(beamColor, step);
    }
    materials.led.emissive.lerp(targetColor, step);
    materials.fanGlow.color.lerp(fanGlowColor, step);

    if (prefersReducedMotion()) {
      return;
    }

    if (fanRef.current) {
      fanRef.current.rotation.z -= delta * 0.55;
    }

    const posAttr = pointsRef.current?.geometry.attributes.position;
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
      {/* Volumetric lamp beam */}
      <mesh position={[0, 2.22, 0]} material={materials.cone}>
        <coneGeometry args={[1.7, 3.1, 40, 1, true]} />
      </mesh>

      {/* Floating dust in the beam */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          map={dustSprite}
          color="#ffe9cf"
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Bunker room shell */}
      <mesh position={[0, 2.5, -5.6]} material={materials.wall} receiveShadow>
        <planeGeometry args={[18, 5.2]} />
      </mesh>
      <mesh position={[-6.8, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.wall}>
        <planeGeometry args={[14, 5.2]} />
      </mesh>
      <mesh position={[6.8, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} material={materials.wall}>
        <planeGeometry args={[14, 5.2]} />
      </mesh>
      <mesh position={[0, 4.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.96} metalness={0.05} />
      </mesh>

      {/* Structural pillars framing the back wall */}
      {[-5.3, 5.3].map((x) => (
        <mesh key={x} position={[x, 2.45, -5.25]} material={materials.steel}>
          <boxGeometry args={[0.5, 4.9, 0.7]} />
        </mesh>
      ))}

      {/* Accent LED conduits along the back wall */}
      <mesh position={[0, 3.62, -5.52]} material={materials.led}>
        <boxGeometry args={[10.1, 0.045, 0.04]} />
      </mesh>
      {[-5.02, 5.02].map((x) => (
        <mesh key={x} position={[x, 2.2, -4.88]} material={materials.led}>
          <boxGeometry args={[0.035, 3.4, 0.035]} />
        </mesh>
      ))}

      {/* Ventilation shaft: slow fan in front of an accent backlight, behind the far operator */}
      <group position={[0, 2.25, -5.5]}>
        <mesh material={materials.fanGlow} position={[0, 0, -0.06]}>
          <circleGeometry args={[0.98, 40]} />
        </mesh>
        <group ref={fanRef}>
          {Array.from({ length: FAN_BLADES }).map((_, i) => {
            const angle = (i / FAN_BLADES) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0]}
                rotation={[0.35, 0, angle]}
                material={materials.darkSteel}
              >
                <boxGeometry args={[0.92, 0.3, 0.02]} />
              </mesh>
            );
          })}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.steel}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
          </mesh>
        </group>
        <mesh material={materials.steel}>
          <torusGeometry args={[1.04, 0.09, 10, 48]} />
        </mesh>
        {/* Guard grille */}
        {[-0.5, 0, 0.5].map((y) => (
          <mesh key={y} position={[0, y, 0.1]} material={materials.darkSteel}>
            <boxGeometry args={[Math.sqrt(1 - y * y) * 2.05, 0.03, 0.03]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.1]} material={materials.darkSteel}>
          <boxGeometry args={[0.03, 2.05, 0.03]} />
        </mesh>
      </group>

      {/* Overhead pipes and cable conduits */}
      <mesh position={[0, 4.62, -2.4]} rotation={[0, 0, Math.PI / 2]} material={materials.steel}>
        <cylinderGeometry args={[0.07, 0.07, 16, 12]} />
      </mesh>
      <mesh position={[0, 4.68, -3.1]} rotation={[0, 0, Math.PI / 2]} material={materials.steel}>
        <cylinderGeometry args={[0.05, 0.05, 16, 12]} />
      </mesh>
      <mesh position={[-2.8, 4.7, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.darkSteel}>
        <cylinderGeometry args={[0.035, 0.035, 14, 8]} />
      </mesh>

      {/* Lamp suspension cable connected directly to the ceiling */}
      <mesh position={[0, 4.36, 0]} material={materials.darkSteel}>
        <cylinderGeometry args={[0.012, 0.012, 1.05, 8]} />
      </mesh>
    </group>
  );
};
