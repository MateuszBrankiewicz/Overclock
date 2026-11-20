import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { prefersReducedMotion } from '../../../../../shared/lib/motion';
import { useGfxSettings } from '../../../stores/useGfxSettings';
import { resetParticlePool, stepParticlePool } from './particlePool';
import { arenaVfxPool } from './vfxEmitter';

export const ParticleBurst: React.FC = () => {
  const gfxQuality = useGfxSettings((s) => s.quality);
  const reducedMotion = prefersReducedMotion();

  if (gfxQuality !== 'high' || reducedMotion) {
    return null;
  }

  return <ParticleBurstPoints />;
};

const ParticleBurstPoints: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pAttr = new THREE.BufferAttribute(arenaVfxPool.positions, 3);
    const cAttr = new THREE.BufferAttribute(arenaVfxPool.colors, 3);
    pAttr.setUsage(THREE.DynamicDrawUsage);
    cAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pAttr);
    geo.setAttribute('color', cAttr);
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      resetParticlePool(arenaVfxPool);
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    stepParticlePool(arenaVfxPool, delta, 2.2);

    const pts = pointsRef.current;
    if (!pts) return;
    const geo = pts.geometry;
    geo.setDrawRange(0, arenaVfxPool.aliveCount);
    if (arenaVfxPool.aliveCount > 0) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.92}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

export const ParticleBurst3D = ParticleBurst;
