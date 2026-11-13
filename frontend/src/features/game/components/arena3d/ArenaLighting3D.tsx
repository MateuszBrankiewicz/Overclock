import { Environment, Lightformer } from '@react-three/drei';
import React, { useMemo } from 'react';
import { Object3D } from 'three';

/**
 * Shared light rig for the bunker: a baked studio environment (so the metal rigs and the table
 * rail pick up reflections instead of rendering black), a front fill aimed at the operators'
 * faces, and two coloured rim lights that separate their silhouettes from the back wall.
 */
export const ArenaLighting3D: React.FC = () => {
  const fillTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0, 1.1, -2.1);
    return target;
  }, []);

  return (
    <>
      {/* Rendered once into a cube map: no per-frame cost. */}
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.5}>
        <color attach="background" args={['#06070b']} />
        <Lightformer
          form="circle"
          intensity={7}
          color="#ffe4bd"
          position={[0, 4.6, 0]}
          target={[0, 0, 0]}
          scale={2.6}
        />
        <Lightformer
          form="rect"
          intensity={3.2}
          color="#38d6f5"
          position={[-6, 2.2, -2.5]}
          target={[0, 1.2, 0]}
          scale={[1.2, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={3.2}
          color="#ffb347"
          position={[6, 2.2, -2.5]}
          target={[0, 1.2, 0]}
          scale={[1.2, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#cbd5e1"
          position={[0, 2.4, 7]}
          target={[0, 1.2, 0]}
          scale={[7, 2.4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#8fa3c2"
          position={[0, 3.4, -7]}
          target={[0, 1.2, 0]}
          scale={[9, 0.7, 1]}
        />
      </Environment>

      <ambientLight intensity={0.22} />
      <hemisphereLight args={['#33415c', '#07080d', 0.55]} />

      {/* Front fill: lights the operators' faces and chests from the player's side */}
      <primitive object={fillTarget} />
      <spotLight
        position={[0, 3.3, 2.4]}
        target={fillTarget}
        angle={0.72}
        penumbra={0.9}
        intensity={46}
        color="#ffe9d2"
      />

      {/* POV light for the hand of cards */}
      <pointLight position={[0, 2.0, 2.7]} intensity={2.4} distance={3.2} color="#ffffff" />

      {/* Coloured rim lights behind the operators */}
      <pointLight position={[-3.4, 2.7, -3.5]} intensity={30} distance={9} color="#22d3ee" />
      <pointLight position={[3.4, 2.7, -3.5]} intensity={30} distance={9} color="#f59e0b" />
    </>
  );
};
