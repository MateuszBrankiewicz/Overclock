import { useFrame, useThree } from '@react-three/fiber';
import React, { useMemo, useRef, useState } from 'react';
import type { Group, Mesh } from 'three';

import { useI18n } from '../../../../shared/i18n';
import type {
  CardProtocol,
  ExploitModule,
  ExploitType,
  PlayerCard,
} from '../../schemas/gameEvents';
import type { CharacterProfile } from '../../utils/characterCatalog';
import { classifyCard, MARK_COLOR } from './hud/cardMarks';
import { prefersReducedMotion } from './hud/motion';
import { createPcbCardBackTexture, createPcbCardTexture } from './pcbCardTexture';

export interface PovHandAndControls3DProps {
  myCards: PlayerCard[];
  selectedCardIds: string[];
  currentTargetProtocol: CardProtocol | null;
  isMyTurn: boolean;
  isEliminated: boolean;
  tablePileCount: number;
  riskLevel: number;
  exploit?: ExploitModule | null;
  canActivateExploit: boolean;
  myCharacter: CharacterProfile;
  onToggleCard: (cardId: string) => void;
  onPlayCards: () => void;
  onCallTrace: () => void;
  onUseChip: (exploit: ExploitType) => void;
}

interface Card3DItemProps {
  card: PlayerCard;
  index: number;
  total: number;
  aspectFactor: number;
  isSelected: boolean;
  currentTargetProtocol: CardProtocol | null;
  onToggle: () => void;
}

const HandCard3D: React.FC<Card3DItemProps> = ({
  card,
  index,
  total,
  aspectFactor,
  isSelected,
  currentTargetProtocol,
  onToggle,
}) => {
  const { t } = useI18n();
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const badge = useMemo(
    () => classifyCard(card.protocol, currentTargetProtocol),
    [card.protocol, currentTargetProtocol]
  );
  const markColor = MARK_COLOR[badge];

  const frontTexture = useMemo(
    () =>
      createPcbCardTexture(card.protocol, card.visualSeed ?? index, badge, isSelected, {
        ready: t.arena.cardReady,
        selectHint: t.arena.cardSelectHint,
      }),
    [card.protocol, card.visualSeed, index, badge, isSelected, t]
  );
  const backTexture = useMemo(() => createPcbCardBackTexture(t.arena.cardBack), [t.arena.cardBack]);

  const mountTimeRef = useRef<number | null>(null);

  const centerOffset = index - (total - 1) / 2;
  // Scale card spread dynamically by viewport aspect ratio so cards NEVER go off-screen
  const baseSpacing = total > 6 ? 0.19 : total > 4 ? 0.23 : 0.27;
  const spacing = baseSpacing * aspectFactor;
  const baseCardScale = Math.min(1, Math.max(0.76, aspectFactor * 1.02));

  const targetX = centerOffset * spacing;
  const baseArchY = 1.25 - Math.abs(centerOffset) * 0.026;
  const baseTargetY = baseArchY + (isSelected ? 0.14 : hovered ? 0.07 : 0);
  const targetZ = 2.02 + index * 0.012 + (isSelected ? 0.12 : hovered ? 0.05 : 0);
  const baseTargetRotZ = isSelected ? 0 : -centerOffset * 0.075;
  const targetRotX = isSelected ? -0.24 : -0.36;
  const baseTargetScale = baseCardScale * (isSelected ? 1.14 : hovered ? 1.06 : 1);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    if (mountTimeRef.current === null) {
      mountTimeRef.current = clock.getElapsedTime();
    }
    const elapsed = clock.getElapsedTime() - mountTimeRef.current;
    const reducedMotion = prefersReducedMotion();
    const dealDelaySec = reducedMotion ? 0 : index * 0.06;
    const isEntering = elapsed < dealDelaySec;

    const isSelectedSway = isSelected && !reducedMotion;
    const t = clock.getElapsedTime();
    const swayY = isSelectedSway ? Math.sin(t * 3.5 + index * 0.8) * 0.012 : 0;
    const swayRotZ = isSelectedSway ? Math.sin(t * 2.5 + index * 0.8) * 0.02 : 0;

    const currentTargetY = isEntering ? baseArchY - 0.45 : baseTargetY + swayY;
    const currentTargetRotZ = baseTargetRotZ + swayRotZ;
    const currentTargetScale = isEntering ? 0.5 : baseTargetScale;

    const step = Math.min(1, delta * 14);
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * step;
    groupRef.current.position.y += (currentTargetY - groupRef.current.position.y) * step;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * step;
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * step;
    groupRef.current.rotation.z += (currentTargetRotZ - groupRef.current.rotation.z) * step;
    const s = groupRef.current.scale.x + (currentTargetScale - groupRef.current.scale.x) * step;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group
      ref={groupRef}
      position={[targetX, baseArchY, targetZ]}
      rotation={[targetRotX, 0, baseTargetRotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.45, 0.012]} />
        <meshStandardMaterial
          color={isSelected ? '#10b981' : '#18181b'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Edge glow frame: match / wild / bluff mark */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.335, 0.465]} />
        <meshBasicMaterial color={markColor} transparent opacity={isSelected ? 0.85 : 0.5} />
      </mesh>

      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.31, 0.44]} />
        <meshStandardMaterial
          map={frontTexture ?? undefined}
          roughness={0.25}
          metalness={0.15}
          emissive={isSelected ? '#10b981' : hovered ? '#34d399' : '#000000'}
          emissiveIntensity={isSelected ? 0.24 : hovered ? 0.1 : 0}
        />
      </mesh>

      <mesh position={[0, 0, -0.007]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.31, 0.44]} />
        <meshStandardMaterial map={backTexture ?? undefined} roughness={0.3} />
      </mesh>
    </group>
  );
};

export const PovHandAndControls3D: React.FC<PovHandAndControls3DProps> = ({
  myCards,
  selectedCardIds,
  currentTargetProtocol,
  isMyTurn,
  isEliminated,
  tablePileCount,
  riskLevel,
  exploit,
  canActivateExploit,
  myCharacter,
  onToggleCard,
  onPlayCards: _onPlayCards,
  onCallTrace: _onCallTrace,
  onUseChip,
}) => {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const aspectFactor = Math.min(1.05, Math.max(0.55, aspect * 0.82));

  const transmitBtnRef = useRef<Mesh>(null);
  const traceBtnRef = useRef<Mesh>(null);

  const canTransmit = isMyTurn && !isEliminated && selectedCardIds.length > 0;
  const canTrace = isMyTurn && !isEliminated && tablePileCount > 0;
  const canUseChip = Boolean(canActivateExploit && exploit && !exploit.isBurned);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (transmitBtnRef.current) {
      transmitBtnRef.current.position.y = canTransmit
        ? 0.8 + Math.sin(elapsed * 6) * 0.01
        : 0.775;
    }
    if (traceBtnRef.current) {
      traceBtnRef.current.position.y = canTrace
        ? 0.8 + Math.sin(elapsed * 8) * 0.012
        : 0.775;
    }
  });

  return (
    <group>
      {/* First-Person Cyber-Forearms & Gloves Resting at Table Edge */}
      <group position={[-0.58 * aspectFactor, 0.86, 2.08]} rotation={[0.3, -0.22, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.13, 0.56]} />
          <meshStandardMaterial color={myCharacter.armorColor} metalness={0.78} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.07, -0.1]}>
          <boxGeometry args={[0.08, 0.02, 0.36]} />
          <meshStandardMaterial
            color={myCharacter.primaryColor}
            emissive={myCharacter.primaryColor}
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
      <group position={[0.58 * aspectFactor, 0.86, 2.08]} rotation={[0.3, 0.22, 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.13, 0.56]} />
          <meshStandardMaterial color={myCharacter.armorColor} metalness={0.78} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.07, -0.1]}>
          <boxGeometry args={[0.08, 0.02, 0.36]} />
          <meshStandardMaterial
            color={myCharacter.primaryColor}
            emissive={myCharacter.primaryColor}
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>

      {/* 3D Cards Held Directly in Player's POV Hand */}
      {myCards.map((card, idx) => (
        <HandCard3D
          key={card.id}
          card={card}
          index={idx}
          total={myCards.length}
          aspectFactor={aspectFactor}
          isSelected={selectedCardIds.includes(card.id)}
          currentTargetProtocol={currentTargetProtocol}
          onToggle={() => onToggleCard(card.id)}
        />
      ))}

      {/* Physical 3D 6-Tube Capacitor Risk Bank on Table Surface */}
      <group position={[-0.36 * aspectFactor, 0.77, 1.32]} rotation={[0, 0.12, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[0.44, 0.04, 0.14]} />
          <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => {
          const active = i < riskLevel;
          const tubeColor = i >= 4 ? '#ef4444' : i >= 2 ? '#f59e0b' : '#10b981';
          return (
            <mesh key={i} position={[-0.175 + i * 0.07, 0.07, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.12, 10]} />
              <meshStandardMaterial
                color={active ? tubeColor : '#27272a'}
                emissive={active ? tubeColor : '#000000'}
                emissiveIntensity={active ? 2.4 : 0}
                transparent
                opacity={active ? 0.95 : 0.45}
              />
            </mesh>
          );
        })}
      </group>

      {/* Physical 3D DIP-8 Exploit Chip Socket on Table Surface */}
      {exploit && (
        <group
          position={[0.36 * aspectFactor, 0.77, 1.32]}
          rotation={[0, -0.12, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (canUseChip) {
              onUseChip(exploit.type);
            }
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.045, 0.18]} />
            <meshStandardMaterial
              color={exploit.isBurned ? '#27272a' : '#083344'}
              emissive={canUseChip ? '#06b6d4' : '#000000'}
              emissiveIntensity={canUseChip ? 1.8 : 0}
            />
          </mesh>
        </group>
      )}

      {/* Physical 3D [CALL TRACE] Red Button on Table Edge (Decorative cyber-switchgear) */}
      <group position={[-0.68 * aspectFactor, 0, 1.36]}>
        <mesh position={[0, 0.76, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.19, 0.05, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh ref={traceBtnRef} position={[0, 0.79, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.06, 16]} />
          <meshStandardMaterial
            color={canTrace ? '#ef4444' : '#450a0a'}
            emissive={canTrace ? '#ef4444' : '#000000'}
            emissiveIntensity={canTrace ? 2.2 : 0}
          />
        </mesh>
      </group>

      {/* Physical 3D [TRANSMIT] Launch Switch on Table Edge (Decorative cyber-switchgear) */}
      <group position={[0.68 * aspectFactor, 0, 1.36]}>
        <mesh position={[0, 0.76, 0]} castShadow>
          <boxGeometry args={[0.32, 0.05, 0.22]} />
          <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh ref={transmitBtnRef} position={[0, 0.79, 0]} castShadow>
          <boxGeometry args={[0.26, 0.06, 0.17]} />
          <meshStandardMaterial
            color={canTransmit ? '#10b981' : '#064e3b'}
            emissive={canTransmit ? '#10b981' : '#000000'}
            emissiveIntensity={canTransmit ? 2.4 : 0}
          />
        </mesh>
      </group>
    </group>
  );
};
