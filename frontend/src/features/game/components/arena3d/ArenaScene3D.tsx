import { Canvas } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';

import type {
  CardProtocol,
  CardsPlayedEvent,
  ExploitModule,
  ExploitType,
  PlayerCard,
  PlayerSeat,
  RoomState,
} from '../../schemas/gameEvents';
import type { ArenaCameraFocus, DischargeCinematic } from '../../stores/types';
import { useGfxSettings } from '../../stores/useGfxSettings';
import type { CharacterProfile } from '../../utils/characterCatalog';
import { resolveSeatCharacter } from '../../utils/characterCatalog';
import { ArenaLighting3D } from './ArenaLighting3D';
import { ArenaPostFx } from './ArenaPostFx';
import { BunkerAtmosphere3D } from './BunkerAtmosphere3D';
import { getBunkerFloorTexture, getTableAoTexture } from './bunkerFloorTexture';
import { CameraController } from './CameraController';
import { OperatorRig3D } from './OperatorRig3D';
import { PovHandAndControls3D } from './PovHandAndControls3D';
import { TableCenterpiece3D } from './TableCenterpiece3D';
import type { useArenaFocus } from './useArenaFocus';
import type { useArenaFrameloop } from './useArenaFrameloop';
import type { SeatLayout } from './useArenaSeats';
import type { CameraOffsets } from './useCameraDrag';
import type { useShockState } from './useShockState';
import { ParticleBurst } from './vfx/ParticleBurst';
import { ShockCables3D } from './vfx/ShockCables3D';
import { TraceDuelBeam3D } from './vfx/TraceDuelBeam3D';

export interface ArenaScene3DProps {
  frameloop: ReturnType<typeof useArenaFrameloop>['frameloop'];
  shock: ReturnType<typeof useShockState>;
  focus: ReturnType<typeof useArenaFocus>;
  cameraFocus: ArenaCameraFocus;
  offsetsRef: React.RefObject<CameraOffsets>;
  roomState: RoomState | null;
  stageAccentColor: string;
  opponents: PlayerSeat[];
  seatLayouts: SeatLayout[];
  activePlayerId: string | null;
  activePlayerNickname: string | undefined;
  dischargeCinematic: DischargeCinematic | null;
  tablePileCount: number;
  currentTargetProtocol: CardProtocol | null;
  lastPlayedCards: CardsPlayedEvent | null;
  revealedCards: PlayerCard[] | null;
  revealDeclaredProtocol: CardProtocol | null;
  revealStartedAtMs: number | null;
  isOutcomeCinematic: boolean;
  isMyTurn: boolean;
  isEliminated: boolean;
  riskLevel: number;
  exploit: ExploitModule | null;
  canActivateExploit: boolean;
  myCards: PlayerCard[];
  selectedCardIds: string[];
  myCharacter: CharacterProfile;
  onToggleCard: (cardId: string) => void;
  onPlayCards: () => void;
  onCallTrace: () => void;
  onUseChip: (exploit: ExploitType) => void;
}

export const ArenaScene3D: React.FC<ArenaScene3DProps> = (p) => {
  const { shock, focus, dischargeCinematic } = p;
  const gfxQuality = useGfxSettings((s) => s.quality);
  const floorTexture = useMemo(() => getBunkerFloorTexture(), []);
  const tableAoTexture = useMemo(() => getTableAoTexture(), []);

  return (
    <div className="absolute inset-0 w-full h-full touch-none">
      <Canvas
        frameloop={p.frameloop}
        shadows
        dpr={[1, 1.5]}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ position: [0, 1.94, 3.15], fov: 50 }}
      >
        {gfxQuality === 'high' && <ArenaPostFx />}
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 7.5, 19]} />

        <CameraController
          focus={p.cameraFocus}
          roomState={p.roomState}
          offsetsRef={p.offsetsRef}
          isLocalEliminated={shock.isLocalEliminatedShown}
          isLocalOverloaded={shock.isLocalOverloaded && shock.isShockActive}
          cinematicStartTimeMs={shock.effectiveShockStartTimeMs}
          subjectPosition={focus.subjectInfo.pos}
          isLocalSubject={focus.subjectInfo.isLocal}
          isOpponentShock={shock.isOpponentShock}
        />

        <ArenaLighting3D />

        {/* Procedural Concrete Bunker Floor */}
        {floorTexture && (
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[18, 18]} />
            <meshStandardMaterial map={floorTexture} roughness={0.72} metalness={0.2} />
          </mesh>
        )}

        {/* Table Ambient Occlusion Shadow Disc */}
        {tableAoTexture && (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.6, 4.6]} />
            <meshBasicMaterial
              map={tableAoTexture}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
        )}

        <BunkerAtmosphere3D accentColor={p.stageAccentColor} />

        <ParticleBurst />

        <TableCenterpiece3D
          tablePileCount={p.tablePileCount}
          currentTargetProtocol={p.currentTargetProtocol}
          roomState={p.roomState}
          lastPlaySeatPosition={focus.lastPlaySeatPosition}
          lastPlayCardCount={p.lastPlayedCards?.cardCount ?? 1}
          flightToken={p.lastPlayedCards}
          isMyTurn={p.isMyTurn}
          activePlayerNickname={p.activePlayerNickname}
          dischargeStartedAtMs={dischargeCinematic?.startedAtMs ?? null}
          revealedCards={p.revealedCards}
          revealDeclaredProtocol={p.revealDeclaredProtocol}
          revealStartedAtMs={p.revealStartedAtMs}
          hideStatusPill={p.isOutcomeCinematic}
        />

        {focus.cableTargetPos && (
          <ShockCables3D
            target={focus.cableTargetPos}
            chargeStartedAtMs={dischargeCinematic?.startedAtMs ?? null}
            strikeAtMs={shock.effectiveShockStartTimeMs}
            overloaded={shock.isShockActive && Boolean(dischargeCinematic?.event.overloaded)}
          />
        )}

        {focus.traceDuel && p.revealStartedAtMs !== null && focus.revealVerdictAtMs !== null && (
          <TraceDuelBeam3D
            from={focus.traceDuel.from}
            to={focus.traceDuel.to}
            startedAtMs={p.revealStartedAtMs}
            endsAtMs={focus.revealVerdictAtMs}
          />
        )}

        {p.opponents.map((opp, idx) => {
          const layout = p.seatLayouts[idx] ?? { position: [0, 0, -2.4], rotationY: 0 };
          const charProfile = resolveSeatCharacter(opp.characterId);
          const isTargetOfCinematic = dischargeCinematic?.event.playerId === opp.playerId;
          const isBeingShocked = isTargetOfCinematic && !dischargeCinematic.event.overloaded;
          const isOverloadDeath = isTargetOfCinematic && dischargeCinematic.event.overloaded;

          return (
            <OperatorRig3D
              key={opp.playerId}
              seat={opp}
              character={charProfile}
              position={layout.position}
              rotationY={layout.rotationY}
              isActiveTurn={p.activePlayerId === opp.playerId}
              isBeingShocked={isBeingShocked && shock.isShockActive}
              isOverloaded={isOverloadDeath && shock.isShockActive}
              isStrikePending={shock.strikePendingPlayerId === opp.playerId}
              isWinner={p.roomState === 'GameOver' && opp.status === 'Active'}
              cinematicStartTimeMs={isTargetOfCinematic ? shock.effectiveShockStartTimeMs : null}
            />
          );
        })}

        {p.roomState !== 'Lobby' && !p.isOutcomeCinematic && (
          <PovHandAndControls3D
            myCards={p.myCards}
            selectedCardIds={p.selectedCardIds}
            currentTargetProtocol={p.currentTargetProtocol}
            isMyTurn={p.isMyTurn}
            isEliminated={p.isEliminated}
            tablePileCount={p.tablePileCount}
            riskLevel={p.riskLevel}
            exploit={p.exploit}
            canActivateExploit={p.canActivateExploit}
            myCharacter={p.myCharacter}
            onToggleCard={p.onToggleCard}
            onPlayCards={p.onPlayCards}
            onCallTrace={p.onCallTrace}
            onUseChip={p.onUseChip}
          />
        )}
      </Canvas>
    </div>
  );
};
