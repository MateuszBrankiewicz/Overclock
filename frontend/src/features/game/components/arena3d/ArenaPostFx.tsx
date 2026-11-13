import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface ArenaPostFxProps {
  strength?: number;
  radius?: number;
  threshold?: number;
}

export const ArenaPostFx: React.FC<ArenaPostFxProps> = ({
  strength = 0.7,
  radius = 0.55,
  threshold = 0.75,
}) => {
  const { gl, scene, camera, size } = useThree();

  const [composer, bloomPass, renderPass, outputPass] = useMemo(() => {
    const comp = new EffectComposer(gl);
    const rp = new RenderPass(scene, camera);
    const bp = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold
    );
    const op = new OutputPass();

    comp.addPass(rp);
    comp.addPass(bp);
    comp.addPass(op);

    return [comp, bp, rp, op] as const;
  }, [gl, scene, camera, size.width, size.height, strength, radius, threshold]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    bloomPass.resolution.set(size.width, size.height);
  }, [composer, gl, size.width, size.height, bloomPass]);

  useEffect(() => {
    return () => {
      bloomPass.dispose();
      renderPass.dispose();
      outputPass.dispose();
      composer.dispose();
    };
  }, [bloomPass, renderPass, outputPass, composer]);

  useFrame((_state, delta) => {
    composer.render(delta);
  }, 1);

  return null;
};
