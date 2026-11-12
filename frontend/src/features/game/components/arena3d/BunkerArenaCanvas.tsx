import { Canvas } from '@react-three/fiber';
import React, { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
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
import type { CharacterId } from '../../utils/characterCatalog';
import { getCharacterById, resolveSeatCharacter } from '../../utils/characterCatalog';
import { PcbCard } from '../PcbCard';
import { CameraController } from './CameraController';
import { createDischargeBadgeTexture } from './dischargeBadgeTexture';
import { ActionStrip } from './hud/ActionStrip';
import { CameraPresetBar } from './hud/CameraPresetBar';
import { OverloadVignette } from './hud/OverloadVignette';
import { PhaseTimers } from './hud/PhaseTimers';
import { ActiveTurnLabel, YourTurnBanner } from './hud/TurnStatusHud';
import { useExploitPicker } from './hud/useExploitPicker';
import { VoltageControls } from './hud/VoltageControls';
import { OperatorRig3D } from './OperatorRig3D';
import { PovHandAndControls3D } from './PovHandAndControls3D';
import { TableCenterpiece3D } from './TableCenterpiece3D';
import { useCameraDrag } from './useCameraDrag';

export interface BunkerArenaCanvasProps {
  players: PlayerSeat[];
  myPlayerId: string | null;
  activePlayerId: string | null;
  pendingDischargePlayerId: string | null;
  selectedCharacterId: CharacterId;
  characterByPlayerId: Record<string, CharacterId>;
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
}

function checkWebGLAvailable(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
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
  characterByPlayerId,
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
}) => {
  const { t } = useI18n();
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());
  const cameraDrag = useCameraDrag();
  const exploitPicker = useExploitPicker(onActivateExploit);

  const myCharacter = useMemo(
    () => getCharacterById(selectedCharacterId),
    [selectedCharacterId]
  );

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

  const isLocalShockTarget = Boolean(
    dischargeCinematic && dischargeCinematic.event.playerId === myPlayerId
  );
  const isLocalOverloaded = Boolean(
    isLocalShockTarget && dischargeCinematic?.event.overloaded
  );

  const shockTargetInfo = useMemo(() => {
    if (!dischargeCinematic) return { pos: null, isOverloaded: false };
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
  }, [dischargeCinematic, myPlayerId, opponents, seatLayouts]);

  const badgeTexture = useMemo(() => {
    if (!dischargeCinematic) return null;
    return createDischargeBadgeTexture(
      dischargeCinematic.event.roll,
      dischargeCinematic.event.riskLevel,
      dischargeCinematic.event.overloaded,
      dischargeCinematic.event.resultingRiskLevel
    );
  }, [dischargeCinematic]);

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

  const canTransmit = isMyTurn && !isEliminated && selectedCardIds.length > 0;
  const canTrace = isMyTurn && !isEliminated && tablePileCount > 0;
  const canUseChip = Boolean(canActivateExploit && exploit && !exploit.isBurned);

  return (
    <div
      data-testid="bunker-arena-stage"
      {...cameraDrag.handlers}
      className="relative w-full h-full min-h-[100dvh] bg-black overflow-hidden select-none touch-none font-mono"
    >
      {/* Top In-Bounds Visor Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">{topBarSlot}</div>
          <PhaseTimers roomState={roomState} />
          <ActiveTurnLabel isMyTurn={isMyTurn} activePlayerNickname={activePlayerNickname} />
        </div>

        <CameraPresetBar
          cameraFocus={cameraFocus}
          showDismiss={Boolean(dischargeCinematic)}
          onDismissDischarge={onDismissDischarge}
          onSelect={(focus, yaw, pitch) => {
            cameraDrag.reset(yaw, pitch);
            onCameraFocusChange(focus);
          }}
        />
      </div>

      <YourTurnBanner isMyTurn={isMyTurn} />

      {/* Fullscreen WebGL 3D First-Person POV Scene */}
      {webGLSupported ? (
        <div className="absolute inset-0 w-full h-full">
          <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.94, 3.15], fov: 50 }}>
            <color attach="background" args={['#040406']} />
            <fog attach="fog" args={['#040406', 5.2, 12.5]} />

            <CameraController
              focus={cameraFocus}
              roomState={roomState}
              offsetsRef={cameraDrag.offsetsRef}
              isLocalEliminated={isEliminated}
              isLocalOverloaded={isLocalOverloaded}
              cinematicStartTimeMs={dischargeCinematic?.startedAtMs ?? null}
            />

            <ambientLight intensity={0.6} />
            <spotLight
              position={[0, 4.3, 0.4]}
              angle={0.75}
              penumbra={0.6}
              intensity={4.2}
              castShadow
              color={
                roomState === 'BluffCheck'
                  ? '#ef4444'
                  : roomState === 'VoltageTest'
                  ? '#f59e0b'
                  : '#10b981'
              }
            />
            <pointLight position={[0, 2.1, 2.8]} intensity={1.9} color="#ffffff" />
            <pointLight position={[-2.5, 2.2, -2]} intensity={1.2} color="#06b6d4" />
            <pointLight position={[2.5, 2.2, -2]} intensity={1.2} color="#f59e0b" />

            <gridHelper args={[16, 32, '#064e3b', '#18181b']} position={[0, 0.01, 0]} />

            <TableCenterpiece3D
              tablePileCount={tablePileCount}
              currentTargetProtocol={currentTargetProtocol}
              roomState={roomState}
              lastPlaySeatPosition={lastPlaySeatPosition}
              lastPlayCardCount={lastPlayedCards?.cardCount ?? 1}
              isMyTurn={isMyTurn}
              activePlayerNickname={activePlayerNickname}
              shockTargetPos={shockTargetInfo.pos}
              isOverloadedShock={shockTargetInfo.isOverloaded}
              testedRiskLevel={dischargeCinematic?.event.riskLevel ?? 1}
            />

            {dischargeCinematic && badgeTexture && badgePosition && (
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
              const charProfile = resolveSeatCharacter(
                opp.playerId,
                myPlayerId,
                selectedCharacterId,
                idx + 1,
                characterByPlayerId
              );
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
                  isBeingShocked={isBeingShocked}
                  isOverloaded={isOverloadDeath}
                  cinematicStartTimeMs={
                    isTargetOfCinematic ? dischargeCinematic.startedAtMs : null
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
        /* Deterministic Non-WebGL / Test Fallback */
        <div
          data-testid="bunker-arena-fallback"
          className="relative z-10 flex flex-col justify-between p-4 pt-16 pb-20 min-h-[100dvh] table-grid"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {opponents.map((opp, idx) => {
              const char = resolveSeatCharacter(
                opp.playerId,
                myPlayerId,
                selectedCharacterId,
                idx + 1,
                characterByPlayerId
              );
              return (
                <div
                  key={opp.playerId}
                  data-testid={`seat-avatar-${opp.playerId}`}
                  className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/90 text-xs"
                >
                  <span style={{ color: char.primaryColor }}>{`[${char.codename}]`}</span>{' '}
                  <span>{opp.nickname}</span>
                </div>
              );
            })}
          </div>

          <div data-testid="pov-hand-fallback" className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold">{`[${myCharacter.codename}]`}</span>
            <div className="flex gap-2">
              {myCards.map((c) => (
                <PcbCard
                  key={c.id}
                  id={c.id}
                  protocol={c.protocol}
                  visualSeed={c.visualSeed}
                  selected={selectedCardIds.includes(c.id)}
                  onClick={() => onToggleCard(c.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {roomState !== 'Lobby' && (
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
        />
      )}

      {isVoltageTestActive && (
        <VoltageControls
          isLocalPlayerPending={isLocalPlayerPending}
          pendingPlayerNickname={pendingPlayerNickname}
          canUseGroundWire={canUseGroundWire}
          onDeployGroundWire={onDeployGroundWire}
          onTriggerDischarge={onTriggerDischarge}
        />
      )}

      {isLocalOverloaded && <OverloadVignette />}

      {/* Screen Reader Live Telemetry Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {dischargeCinematic
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
      {children && (
        <div className="relative z-20 flex items-center justify-center p-4 min-h-[100dvh] pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl">{children}</div>
        </div>
      )}
    </div>
  );
};
