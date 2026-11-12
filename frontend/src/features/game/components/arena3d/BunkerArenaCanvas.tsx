import { Canvas } from '@react-three/fiber';
import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

import { useI18n } from '../../../../shared/i18n';
import { checkWebGLAvailable } from '../../../../shared/lib/webgl';
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
import { useGameStore } from '../../stores/useGameStore';
import { useGfxSettings } from '../../stores/useGfxSettings';
import { useRulesModalStore } from '../../stores/useRulesModalStore';
import { type CharacterId, resolveSeatCharacter } from '../../utils/characterCatalog';
import { DRUM_SPINDOWN_MS } from '../../utils/cinematicTiming';
import { EventFeed } from '../EventFeed';
import { ArenaFallback } from './ArenaFallback';
import { ArenaPostFx } from './ArenaPostFx';
import { BunkerAtmosphere3D } from './BunkerAtmosphere3D';
import { getBunkerFloorTexture, getTableAoTexture } from './bunkerFloorTexture';
import { CameraController } from './CameraController';
import { createDischargeBadgeTexture } from './dischargeBadgeTexture';
import { ActionStrip } from './hud/ActionStrip';
import { CameraPresetBar } from './hud/CameraPresetBar';
import { CardMarkLegend } from './hud/CardMarkLegend';
import { FirstTurnHint } from './hud/FirstTurnHint';
import { useFirstTurnHint } from './hud/firstTurnHint';
import { HotkeyCheatSheet } from './hud/HotkeyCheatSheet';
import { prefersReducedMotion, useFinePointer } from './hud/motion';
import { OverloadVignette } from './hud/OverloadVignette';
import { PhaseTimers } from './hud/PhaseTimers';
import { SpectatorHud } from './hud/SpectatorHud';
import { YourTurnBanner } from './hud/TurnStatusHud';
import { TurnUrgencyCountdown } from './hud/TurnUrgencyCountdown';
import { useArenaHotkeys } from './hud/useArenaHotkeys';
import { useExploitPicker } from './hud/useExploitPicker';
import { VoltageControls } from './hud/VoltageControls';
import { OperatorRig3D } from './OperatorRig3D';
import { PovHandAndControls3D } from './PovHandAndControls3D';
import { TableCenterpiece3D } from './TableCenterpiece3D';
import { useArenaFrameloop } from './useArenaFrameloop';
import { useCameraDrag } from './useCameraDrag';
import { ParticleBurst } from './vfx/ParticleBurst';
import { emitDischargeImpactSparks } from './vfx/vfxEmitter';

export interface BunkerArenaCanvasProps {
  players: PlayerSeat[];
  myPlayerId: string | null;
  activePlayerId: string | null;
  pendingDischargePlayerId: string | null;
  selectedCharacterId: CharacterId;
  tablePileCount: number;
  currentTargetProtocol: CardProtocol | null;
  roomState: RoomState | null;
  lastPlayedCards: CardsPlayedEvent | null;
  cameraFocus: ArenaCameraFocus;
  onCameraFocusChange: (focus: ArenaCameraFocus) => void;
  myCards?: PlayerCard[];
  selectedCardIds?: string[];
  isMyTurn?: boolean;
  isEliminated?: boolean;
  riskLevel?: number;
  exploit?: ExploitModule | null;
  canActivateExploit?: boolean;
  onToggleCard?: (cardId: string) => void;
  onPlayCards?: () => void;
  onCallTrace?: () => void;
  onActivateExploit?: (exploit: ExploitType, newTargetProtocol?: CardProtocol) => void;
  topBarSlot?: React.ReactNode;
  children?: React.ReactNode;
  isVoltageTestActive?: boolean;
  dischargeCinematic?: DischargeCinematic | null;
  pendingPlayerNickname?: string | null;
  isLocalPlayerPending?: boolean;
  canUseGroundWire?: boolean;
  onDeployGroundWire?: () => void;
  onTriggerDischarge?: () => void;
  onDismissDischarge?: () => void;
  /** Cards flipped face-up on the table after a trace. */
  revealedCards?: PlayerCard[] | null;
  revealDeclaredProtocol?: CardProtocol | null;
  revealStartedAtMs?: number | null;
  bluffDetected?: boolean;
  revealLoserPlayerId?: string | null;
  /**
   * `modal`: the centre panel (lobby, summary, intermission) takes touch input and scrolls on
   * small screens. `passive`: it only displays and the table stays draggable around it.
   */
  overlayMode?: 'modal' | 'passive';
}

function computeOpponentSeatLayout(
  count: number
): Array<{ position: [number, number, number]; rotationY: number }> {
  if (count <= 1) {
    return [{ position: [0, 0, -2.4], rotationY: 0 }];
  }
  if (count === 2) {
    return [
      { position: [-1.55, 0, -1.95], rotationY: Math.PI / 4.5 },
      { position: [1.55, 0, -1.95], rotationY: -Math.PI / 4.5 },
    ];
  }
  return [
    { position: [-1.85, 0, -1.45], rotationY: Math.PI / 3.4 },
    { position: [0, 0, -2.45], rotationY: 0 },
    { position: [1.85, 0, -1.45], rotationY: -Math.PI / 3.4 },
  ];
}

export const BunkerArenaCanvas: React.FC<BunkerArenaCanvasProps> = ({
  players,
  myPlayerId,
  activePlayerId,
  pendingDischargePlayerId,
  selectedCharacterId,
  tablePileCount,
  currentTargetProtocol,
  roomState,
  lastPlayedCards,
  cameraFocus,
  onCameraFocusChange,
  myCards = [],
  selectedCardIds = [],
  isMyTurn = false,
  isEliminated = false,
  riskLevel = 1,
  exploit = null,
  canActivateExploit = false,
  onToggleCard = () => {},
  onPlayCards = () => {},
  onCallTrace = () => {},
  onActivateExploit = () => {},
  topBarSlot,
  children,
  isVoltageTestActive = false,
  dischargeCinematic = null,
  pendingPlayerNickname = null,
  isLocalPlayerPending = false,
  canUseGroundWire = false,
  onDeployGroundWire,
  onTriggerDischarge,
  onDismissDischarge,
  revealedCards = null,
  revealDeclaredProtocol = null,
  revealStartedAtMs = null,
  bluffDetected = false,
  revealLoserPlayerId = null,
  overlayMode = 'passive',
}) => {
  const { t } = useI18n();
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());
  const cameraDrag = useCameraDrag();
  const gfxQuality = useGfxSettings((s) => s.quality);
  const spectatorTargetPlayerId = useGameStore((s) => s.spectatorTargetPlayerId);
  const setSpectatorTarget = useGameStore((s) => s.setSpectatorTarget);
  const floorTexture = useMemo(() => getBunkerFloorTexture(), []);
  const tableAoTexture = useMemo(() => getTableAoTexture(), []);
  const { frameloop, wake } = useArenaFrameloop(roomState);
  useEffect(() => {
    wake();
  }, [cameraFocus, gfxQuality, wake]);

  const stageAccentColor = useMemo(() => {
    if (roomState === 'BluffCheck') return '#ef4444';
    if (roomState === 'VoltageTest') return '#f59e0b';
    if (currentTargetProtocol === 'Beta') return '#f97316';
    if (currentTargetProtocol === 'Gamma') return '#38bdf8';
    return '#10b981';
  }, [roomState, currentTargetProtocol]);
  const dragHandlers = useMemo(
    () => ({
      ...cameraDrag.handlers,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        wake();
        cameraDrag.handlers.onPointerDown(e);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        cameraDrag.handlers.onPointerMove(e);
        if (e.buttons !== 0) wake();
      },
    }),
    [cameraDrag.handlers, wake]
  );
  const exploitPicker = useExploitPicker(onActivateExploit);

  const myCharacter = useMemo(() => {
    const mySeat = players.find((p) => p.playerId === myPlayerId);
    return resolveSeatCharacter(mySeat?.characterId ?? selectedCharacterId);
  }, [players, myPlayerId, selectedCharacterId]);

  const opponents = useMemo(
    () => players.filter((p) => p.playerId !== myPlayerId),
    [players, myPlayerId]
  );
  const activePlayerNickname = useMemo(
    () => players.find((p) => p.playerId === activePlayerId)?.nickname,
    [players, activePlayerId]
  );
  const seatLayouts = useMemo(
    () => computeOpponentSeatLayout(opponents.length),
    [opponents.length]
  );

  const spindownDelayMs = prefersReducedMotion() ? 0 : DRUM_SPINDOWN_MS;
  const [isShockActive, setIsShockActive] = useState<boolean>(() => {
    if (!dischargeCinematic) return false;
    return Date.now() - dischargeCinematic.startedAtMs >= spindownDelayMs;
  });

  useEffect(() => {
    if (!dischargeCinematic) {
      const t = setTimeout(() => setIsShockActive(false), 0);
      return () => clearTimeout(t);
    }
    const elapsed = Date.now() - dischargeCinematic.startedAtMs;
    const remaining = spindownDelayMs - elapsed;
    if (remaining <= 0) {
      const t = setTimeout(() => setIsShockActive(true), 0);
      return () => clearTimeout(t);
    }
    const tReset = setTimeout(() => setIsShockActive(false), 0);
    const timer = setTimeout(() => {
      setIsShockActive(true);
    }, remaining);
    return () => {
      clearTimeout(tReset);
      clearTimeout(timer);
    };
  }, [dischargeCinematic, spindownDelayMs]);

  const effectiveShockStartTimeMs = useMemo(() => {
    if (!dischargeCinematic) return null;
    return dischargeCinematic.startedAtMs + spindownDelayMs;
  }, [dischargeCinematic, spindownDelayMs]);

  const isLocalShockTarget = Boolean(
    dischargeCinematic && dischargeCinematic.event.playerId === myPlayerId
  );
  const isLocalOverloaded = Boolean(
    isLocalShockTarget && dischargeCinematic?.event.overloaded
  );

  const shockTargetInfo = useMemo(() => {
    if (!dischargeCinematic || !isShockActive) return { pos: null, isOverloaded: false };
    const targetPlayerId = dischargeCinematic.event.playerId;
    const isOverloaded = dischargeCinematic.event.overloaded;

    if (targetPlayerId === myPlayerId) {
      return { pos: [0, 1.25, 2.05] as [number, number, number], isOverloaded };
    }
    const oppIdx = opponents.findIndex((o) => o.playerId === targetPlayerId);
    if (oppIdx >= 0 && seatLayouts[oppIdx]) {
      const p = seatLayouts[oppIdx].position;
      return { pos: [p[0], p[1] + 1.15, p[2] + 0.2] as [number, number, number], isOverloaded };
    }
    return { pos: [0, 1.1, -2.2] as [number, number, number], isOverloaded };
  }, [dischargeCinematic, isShockActive, myPlayerId, opponents, seatLayouts]);

  useEffect(() => {
    if (isShockActive && shockTargetInfo.pos) {
      emitDischargeImpactSparks(shockTargetInfo.pos, shockTargetInfo.isOverloaded);
    }
  }, [isShockActive, shockTargetInfo.pos, shockTargetInfo.isOverloaded]);

  const badgeTexture = useMemo(() => {
    if (!dischargeCinematic) return null;
    return createDischargeBadgeTexture(
      dischargeCinematic.event.roll,
      dischargeCinematic.event.riskLevel,
      dischargeCinematic.event.overloaded,
      dischargeCinematic.event.resultingRiskLevel,
      {
        overload: t.arena.badgeOverload,
        stabilized: t.arena.badgeStabilized,
        roll: t.arena.badgeRoll,
        risk: t.arena.badgeRisk,
        verdictOverload: t.arena.badgeVerdictOverload,
        verdictSurvived: t.arena.badgeVerdictSurvived,
      }
    );
  }, [dischargeCinematic, t]);

  useEffect(() => {
    return () => {
      badgeTexture?.dispose();
    };
  }, [badgeTexture]);

  const badgePosition = useMemo<[number, number, number] | null>(() => {
    if (!shockTargetInfo.pos) return null;
    const p = shockTargetInfo.pos;
    if (dischargeCinematic?.event.playerId === myPlayerId) {
      return [0, 1.62, 1.65];
    }
    return [p[0], p[1] + 0.95, p[2]];
  }, [shockTargetInfo.pos, dischargeCinematic, myPlayerId]);

  const lastPlaySeatPosition = useMemo<[number, number, number] | null>(() => {
    if (!lastPlayedCards) return null;
    if (lastPlayedCards.playerId === myPlayerId) {
      return [0, 1.15, 2.02];
    }
    const oppIdx = opponents.findIndex((o) => o.playerId === lastPlayedCards.playerId);
    if (oppIdx >= 0 && seatLayouts[oppIdx]) {
      return seatLayouts[oppIdx].position;
    }
    return [0, 1.1, -2.4];
  }, [lastPlayedCards, myPlayerId, opponents, seatLayouts]);

  const revealLoserPos = useMemo<[number, number, number] | null>(() => {
    if (!revealLoserPlayerId) return null;
    if (revealLoserPlayerId === myPlayerId) {
      return [0, 1.35, 1.8];
    }
    const oppIdx = opponents.findIndex((o) => o.playerId === revealLoserPlayerId);
    if (oppIdx >= 0 && seatLayouts[oppIdx]) {
      const p = seatLayouts[oppIdx].position;
      return [p[0], 1.35, p[2]];
    }
    return [0, 1.35, -2.4];
  }, [revealLoserPlayerId, myPlayerId, opponents, seatLayouts]);

  const subjectInfo = useMemo<{
    pos: [number, number, number] | null;
    isLocal: boolean;
  }>(() => {
    if (revealLoserPos) {
      return { pos: revealLoserPos, isLocal: revealLoserPlayerId === myPlayerId };
    }
    if (dischargeCinematic) {
      const pid = dischargeCinematic.event.playerId;
      const isLocal = pid === myPlayerId;
      if (isLocal) return { pos: [0, 1.25, 2.05], isLocal: true };
      const oppIdx = opponents.findIndex((o) => o.playerId === pid);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
    }
    if (pendingDischargePlayerId) {
      const isLocal = pendingDischargePlayerId === myPlayerId;
      if (isLocal) return { pos: [0, 1.25, 2.05], isLocal: true };
      const oppIdx = opponents.findIndex((o) => o.playerId === pendingDischargePlayerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
    }
    if (roomState === 'GameOver') {
      const winner = players.find((p) => p.status === 'Active');
      if (winner) {
        const isLocal = winner.playerId === myPlayerId;
        if (isLocal) return { pos: [0, 1.25, 2.05], isLocal: true };
        const oppIdx = opponents.findIndex((o) => o.playerId === winner.playerId);
        if (oppIdx >= 0 && seatLayouts[oppIdx]) {
          return { pos: seatLayouts[oppIdx].position, isLocal: false };
        }
      }
    }
    if (isEliminated && spectatorTargetPlayerId) {
      const oppIdx = opponents.findIndex((o) => o.playerId === spectatorTargetPlayerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
    }
    if (roomState === 'TurnActive' && activePlayerId) {
      const isLocal = activePlayerId === myPlayerId;
      if (isLocal) return { pos: [0, 1.25, 2.05], isLocal: true };
      const oppIdx = opponents.findIndex((o) => o.playerId === activePlayerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        return { pos: seatLayouts[oppIdx].position, isLocal: false };
      }
    }
    return { pos: null, isLocal: false };
  }, [
    revealLoserPos,
    revealLoserPlayerId,
    myPlayerId,
    dischargeCinematic,
    pendingDischargePlayerId,
    roomState,
    players,
    activePlayerId,
    opponents,
    seatLayouts,
    isEliminated,
    spectatorTargetPlayerId,
  ]);

  const isOpponentShock = Boolean(
    dischargeCinematic &&
      isShockActive &&
      dischargeCinematic.event.playerId !== myPlayerId
  );

  const canTransmit = isMyTurn && !isEliminated && selectedCardIds.length > 0;
  const canTrace = isMyTurn && !isEliminated && tablePileCount > 0;
  const canUseChip = Boolean(canActivateExploit && exploit && !exploit.isBurned);

  const showKeyHints = useFinePointer();
  const firstTurnHint = useFirstTurnHint(isMyTurn && !isEliminated, roomState);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const rulesOpen = useRulesModalStore((s) => s.isOpen);
  const hotkeys = useArenaHotkeys({
    enabled: roomState !== 'Lobby' && roomState !== 'GameOver' && !isEliminated && !rulesOpen,
    canTransmit,
    canTrace,
    canUseChip,
    cardIds: myCards.map((c) => c.id),
    selectedCardIds,
    exploit,
    picker: exploitPicker,
    onToggleCard,
    onClearSelection: clearSelection,
    onPlayCards,
    onCallTrace,
  });

  return (
    <div
      data-testid="bunker-arena-stage"
      {...dragHandlers}
      className="relative w-full h-full min-h-[100dvh] bg-black overflow-hidden select-none font-mono"
    >
      {/* Top In-Bounds Visor Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-start gap-2 max-w-[min(90vw,20rem)]">
          <div className="flex items-center gap-2">{topBarSlot}</div>
          <PhaseTimers roomState={roomState} />
          {roomState !== 'Lobby' && <EventFeed />}
        </div>

        <CameraPresetBar
          cameraFocus={cameraFocus}
          showDismiss={Boolean(dischargeCinematic)}
          onDismissDischarge={onDismissDischarge}
          onSelect={(focus, yaw, pitch) => {
            cameraDrag.reset(yaw, pitch);
            wake();
            onCameraFocusChange(focus);
          }}
        />
      </div>

      <YourTurnBanner isMyTurn={isMyTurn} />

      {/* Fullscreen WebGL 3D First-Person POV Scene */}
      {webGLSupported ? (
        <div className="absolute inset-0 w-full h-full touch-none">
          <Canvas
            frameloop={frameloop}
            shadows
            dpr={[1, 1.5]}
            gl={{
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
            camera={{ position: [0, 1.94, 3.15], fov: 50 }}
          >
            {gfxQuality === 'high' && <ArenaPostFx />}
            <color attach="background" args={['#040406']} />
            <fog attach="fog" args={['#040406', 5.2, 12.5]} />

            <CameraController
              focus={cameraFocus}
              roomState={roomState}
              offsetsRef={cameraDrag.offsetsRef}
              isLocalEliminated={isEliminated}
              isLocalOverloaded={isLocalOverloaded && isShockActive}
              cinematicStartTimeMs={effectiveShockStartTimeMs}
              subjectPosition={subjectInfo.pos}
              isLocalSubject={subjectInfo.isLocal}
              isOpponentShock={isOpponentShock}
            />

            <ambientLight intensity={0.15} />
            <hemisphereLight args={['#1e293b', '#020617', 0.28]} />

            <pointLight position={[0, 2.0, 2.7]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-2.5, 2.2, -2]} intensity={0.55} color="#06b6d4" />
            <pointLight position={[2.5, 2.2, -2]} intensity={0.55} color="#f59e0b" />

            {/* Procedural Concrete Bunker Floor */}
            {floorTexture && (
              <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[18, 18]} />
                <meshStandardMaterial
                  map={floorTexture}
                  roughness={0.88}
                  metalness={0.12}
                />
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

            <BunkerAtmosphere3D accentColor={stageAccentColor} />

            {isShockActive && shockTargetInfo.pos && (
              <pointLight
                position={shockTargetInfo.pos}
                color={shockTargetInfo.isOverloaded ? '#f97316' : '#38bdf8'}
                intensity={7.5}
                distance={5}
              />
            )}

            <ParticleBurst />

            <TableCenterpiece3D
              tablePileCount={tablePileCount}
              currentTargetProtocol={currentTargetProtocol}
              roomState={roomState}
              lastPlaySeatPosition={lastPlaySeatPosition}
              lastPlayCardCount={lastPlayedCards?.cardCount ?? 1}
              flightToken={lastPlayedCards}
              isMyTurn={isMyTurn}
              activePlayerNickname={activePlayerNickname}
              shockTargetPos={shockTargetInfo.pos}
              isOverloadedShock={shockTargetInfo.isOverloaded}
              testedRiskLevel={dischargeCinematic?.event.riskLevel ?? 1}
              dischargeStartedAtMs={dischargeCinematic?.startedAtMs ?? null}
              dischargeRoll={dischargeCinematic?.event.roll ?? null}
              revealedCards={revealedCards}
              revealDeclaredProtocol={revealDeclaredProtocol}
              revealStartedAtMs={revealStartedAtMs}
              bluffDetected={bluffDetected}
              revealLoserPos={revealLoserPos}
            />

            {dischargeCinematic && isShockActive && badgeTexture && badgePosition && (
              <mesh position={badgePosition}>
                <planeGeometry args={[1.4, 0.7]} />
                <meshBasicMaterial
                  map={badgeTexture}
                  transparent
                  opacity={0.96}
                  depthWrite={false}
                />
              </mesh>
            )}

            {opponents.map((opp, idx) => {
              const layout = seatLayouts[idx] ?? { position: [0, 0, -2.4], rotationY: 0 };
              const charProfile = resolveSeatCharacter(opp.characterId);
              const isTargetOfCinematic =
                dischargeCinematic?.event.playerId === opp.playerId;
              const isBeingShocked =
                isTargetOfCinematic && !dischargeCinematic.event.overloaded;
              const isOverloadDeath =
                isTargetOfCinematic && dischargeCinematic.event.overloaded;

              return (
                <OperatorRig3D
                  key={opp.playerId}
                  seat={opp}
                  character={charProfile}
                  position={layout.position}
                  rotationY={layout.rotationY}
                  isActiveTurn={activePlayerId === opp.playerId}
                  isPendingVoltage={pendingDischargePlayerId === opp.playerId}
                  isBeingShocked={isBeingShocked && isShockActive}
                  isOverloaded={isOverloadDeath && isShockActive}
                  isWinner={roomState === 'GameOver' && opp.status === 'Active'}
                  cinematicStartTimeMs={
                    isTargetOfCinematic ? effectiveShockStartTimeMs : null
                  }
                />
              );
            })}

            {roomState !== 'Lobby' && (
              <PovHandAndControls3D
                myCards={myCards}
                selectedCardIds={selectedCardIds}
                currentTargetProtocol={currentTargetProtocol}
                isMyTurn={isMyTurn}
                isEliminated={isEliminated}
                tablePileCount={tablePileCount}
                riskLevel={riskLevel}
                exploit={exploit}
                canActivateExploit={canActivateExploit}
                myCharacter={myCharacter}
                onToggleCard={onToggleCard}
                onPlayCards={onPlayCards}
                onCallTrace={onCallTrace}
                onUseChip={exploitPicker.request}
              />
            )}
          </Canvas>
        </div>
      ) : (
        <ArenaFallback
          opponents={opponents}
          myPlayerId={myPlayerId}
          myCharacter={myCharacter}
          selectedCharacterId={selectedCharacterId}
          tablePileCount={tablePileCount}
          currentTargetProtocol={currentTargetProtocol}
          lastPlayedCards={lastPlayedCards}
          myCards={myCards}
          selectedCardIds={selectedCardIds}
          onToggleCard={onToggleCard}
        />
      )}

      {/* Atmospheric vignette framing the bunker arena */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,4,6,0.65)_100%)]"
      />

      {roomState !== 'Lobby' && !isEliminated && (
        <ActionStrip
          canTrace={canTrace}
          canTransmit={canTransmit}
          canUseChip={canUseChip}
          exploit={exploit}
          riskLevel={riskLevel}
          myCharacter={myCharacter}
          selectedCount={selectedCardIds.length}
          currentTargetProtocol={currentTargetProtocol}
          picker={exploitPicker}
          onCallTrace={onCallTrace}
          onPlayCards={onPlayCards}
          showKeyHints={showKeyHints}
        />
      )}

      {roomState !== 'Lobby' && isEliminated && roomState !== 'GameOver' && (
        <SpectatorHud
          livingOpponents={opponents.filter((p) => p.status === 'Active')}
          currentTargetId={spectatorTargetPlayerId}
          cameraFocus={cameraFocus}
          onSelectTarget={setSpectatorTarget}
          onSelectFocus={onCameraFocusChange}
        />
      )}

      {roomState !== 'Lobby' && myCards.length > 0 && !isEliminated && <CardMarkLegend />}
      <FirstTurnHint
        visible={firstTurnHint.visible && selectedCardIds.length === 0}
        onDismiss={firstTurnHint.dismiss}
      />
      <HotkeyCheatSheet open={hotkeys.helpOpen} onClose={hotkeys.closeHelp} />

      {roomState === 'TurnActive' && <TurnUrgencyCountdown isMyTurn={isMyTurn && !isEliminated} />}

      {isVoltageTestActive && (
        <VoltageControls
          isLocalPlayerPending={isLocalPlayerPending}
          pendingPlayerNickname={pendingPlayerNickname}
          canUseGroundWire={canUseGroundWire}
          onDeployGroundWire={onDeployGroundWire}
          onTriggerDischarge={onTriggerDischarge}
        />
      )}

      {isLocalOverloaded && isShockActive && <OverloadVignette />}

      {/* Screen Reader Live Telemetry Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {dischargeCinematic && isShockActive
          ? `${
              dischargeCinematic.event.overloaded
                ? t.voltage.criticalOverload
                : t.voltage.dischargeComplete
            }. ${t.voltage.rollResult}: ${dischargeCinematic.event.roll}, ${
              t.voltage.testedRisk
            }: ${dischargeCinematic.event.riskLevel}.`
          : ''}
      </div>

      {/* Center Stage Overlay Slot (Lobby Roster / Bluff Reveal / GameOver) */}
      {children &&
        (overlayMode === 'modal' ? (
          // Own scroll container: on phones the lobby is taller than the screen, and touches
          // here must scroll the panel instead of rotating the camera underneath.
          <div
            data-testid="arena-overlay-modal"
            data-no-camera-drag
            className="absolute inset-0 z-20 overflow-y-auto overscroll-contain touch-pan-y"
          >
            <div className="flex min-h-full items-center justify-center px-4 pt-24 pb-8 sm:p-4 sm:pt-20">
              <div className="w-full max-w-2xl">{children}</div>
            </div>
          </div>
        ) : (
          <div className="relative z-20 flex items-center justify-center p-4 min-h-[100dvh] pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl">{children}</div>
          </div>
        ))}
    </div>
  );
};
