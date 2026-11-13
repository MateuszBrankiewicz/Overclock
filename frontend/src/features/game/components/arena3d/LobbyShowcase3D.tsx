import { Canvas, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { Group } from 'three';

import { prefersReducedMotion } from '../../../../shared/lib/motion';
import { type CharacterId, resolveSeatCharacter } from '../../utils/characterCatalog';
import { BunkerAtmosphere3D } from './BunkerAtmosphere3D';
import { getBunkerFloorTexture, getTableAoTexture } from './bunkerFloorTexture';
import { OperatorRig3D } from './OperatorRig3D';
import { ServerRackDiodes3D } from './ServerRackDiodes3D';

export interface LobbyShowcase3DProps {
  selectedCharacterId: CharacterId;
  onOperatorClick?: () => void;
}

const ShowcaseCamera: React.FC = () => {
  useFrame(({ clock, camera }) => {
    if (prefersReducedMotion()) {
      camera.position.set(0, 1.85, 3.1);
      camera.lookAt(0, 1.1, -0.6);
      return;
    }
    const elapsed = clock.getElapsedTime();
    const x = Math.sin(elapsed * 0.12) * 0.75;
    const z = 3.1 + Math.cos(elapsed * 0.08) * 0.2;
    camera.position.set(x, 1.85, z);
    camera.lookAt(0, 1.1, -0.6);
  });
  return null;
};

const ShowcaseHangingLamp: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const lampRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!lampRef.current) return;
    if (prefersReducedMotion()) {
      lampRef.current.rotation.set(0, 0, 0);
      return;
    }
    const elapsed = clock.getElapsedTime();
    lampRef.current.rotation.z = Math.sin(elapsed * 0.8) * 0.035;
    lampRef.current.rotation.x = Math.cos(elapsed * 0.6) * 0.025;
  });

  return (
    <group ref={lampRef} position={[0, 3.1, -0.5]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
        <meshStandardMaterial color="#27272a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[0.32, 0.28, 16]} />
        <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.4} />
      </mesh>
      <pointLight position={[0, -0.15, 0]} intensity={1.8} distance={7} color={accentColor} />
    </group>
  );
};

export const LobbyShowcase3D: React.FC<LobbyShowcase3DProps> = ({
  selectedCharacterId,
  onOperatorClick,
}) => {
  const floorTexture = useMemo(() => getBunkerFloorTexture(), []);
  const tableAoTexture = useMemo(() => getTableAoTexture(), []);
  const characterProfile = useMemo(
    () => resolveSeatCharacter(selectedCharacterId),
    [selectedCharacterId]
  );

  return (
    <div
      data-testid="lobby-showcase-3d"
      className="absolute inset-0 w-full h-full pointer-events-auto"
    >
      <Canvas
        camera={{ position: [0, 1.85, 3.1], fov: 52 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#040406']} />
        <fog attach="fog" args={['#040406', 4.5, 12.0]} />

        <ShowcaseCamera />

        <ambientLight intensity={0.2} />
        <hemisphereLight args={['#1e293b', '#020617', 0.32]} />
        <pointLight position={[0, 2.4, 2.5]} intensity={1.0} color="#ffffff" />
        <pointLight position={[-2.5, 2.0, -2]} intensity={0.5} color="#06b6d4" />
        <pointLight position={[2.5, 2.0, -2]} intensity={0.5} color="#f59e0b" />

        <ShowcaseHangingLamp accentColor={characterProfile.primaryColor} />

        {/* Procedural Floor */}
        {floorTexture && (
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[18, 18]} />
            <meshStandardMaterial map={floorTexture} roughness={0.88} metalness={0.12} />
          </mesh>
        )}

        {/* Table Shadow */}
        {tableAoTexture && (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.6, 4.6]} />
            <meshBasicMaterial map={tableAoTexture} transparent opacity={0.85} depthWrite={false} />
          </mesh>
        )}

        {/* Table Surface */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.74, 0]} receiveShadow>
            <cylinderGeometry args={[2.0, 2.0, 0.06, 36]} />
            <meshStandardMaterial color="#0c0e14" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.35, 0.55, 0.74, 16]} />
            <meshStandardMaterial color="#090a0f" metalness={0.9} roughness={0.4} />
          </mesh>
        </group>

        {/* Atmosphere & Server Diodes */}
        <BunkerAtmosphere3D accentColor={characterProfile.primaryColor} />
        <ServerRackDiodes3D />

        {/* Preview Seated Operator */}
        <group onClick={onOperatorClick}>
          <OperatorRig3D
            seat={{
              playerId: 'preview',
              nickname: characterProfile.codename,
              status: 'Active',
              isReady: true,
              handCount: 3,
              riskLevel: 1,
              characterId: selectedCharacterId,
            }}
            character={characterProfile}
            position={[0, 0, -1.95]}
            rotationY={0}
            isActiveTurn={false}
          />
        </group>
      </Canvas>
    </div>
  );
};
