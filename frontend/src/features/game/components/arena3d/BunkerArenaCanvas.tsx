import { Canvas, useFrame, useThree } from '@react-three/fiber';
import clsx from 'clsx';
import { Camera, Eye, Layers } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';

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
import { createDischargeBadgeTexture } from './dischargeBadgeTexture';
import { OperatorRig3D } from './OperatorRig3D';
import { PovHandAndControls3D } from './PovHandAndControls3D';
import { TableCenterpiece3D } from './TableCenterpiece3D';

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

const CameraController: React.FC<{
  focus: ArenaCameraFocus;
  roomState: RoomState | null;
  yawOffset: number;
  pitchOffset: number;
  isLocalEliminated: boolean;
  isLocalOverloaded: boolean;
  cinematicStartTimeMs: number | null;
}> = ({
  focus,
  roomState,
  yawOffset,
  pitchOffset,
  isLocalEliminated,
  isLocalOverloaded,
  cinematicStartTimeMs,
}) => {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  // Pull camera slightly back on narrow/mobile screens so nothing clips horizontally
  const mobilePullback = aspect < 1 ? (1 - aspect) * 0.55 : 0;

  const targetPos = useMemo(() => new Vector3(), []);
  const targetLook = useMemo(() => new Vector3(), []);
  const currentLook = useRef(new Vector3(0, 1.0, 0.2));

  useFrame(({ camera }, delta) => {
    const localDeathElapsed =
      isLocalOverloaded && cinematicStartTimeMs
        ? Math.max(0, (Date.now() - cinematicStartTimeMs) / 1000)
        : null;

    // 1. Local Player Death Slam Sequence (First Person POV)
    if (localDeathElapsed !== null) {
      let rollZ = 0;
      let snapCamera = false;

      if (localDeathElapsed < 0.35) {
        // Anticipation: Cylinder locks onto our visor
        targetPos.set(0, 1.94, 3.15 + mobilePullback);
        targetLook.set(0, 1.25, 0);
      } else if (localDeathElapsed < 0.55) {
        // Lightning Impact Jolt: Body & head arch back
        const t = (localDeathElapsed - 0.35) / 0.2;
        targetPos.set(0, 1.94 + t * 0.12, 3.15 + t * 0.15 + mobilePullback);
        targetLook.set(0, 1.45, 0);
      } else if (localDeathElapsed < 1.1) {
        // High-voltage seizure spasm: violent jitter
        const decay = 1 - (localDeathElapsed - 0.55) / 0.55;
        const shakeX = Math.sin(localDeathElapsed * 75) * 0.05 * decay;
        const shakeY = Math.cos(localDeathElapsed * 60) * 0.04 * decay;
        targetPos.set(shakeX, 1.94 + shakeY, 3.15 + mobilePullback);
        targetLook.set(0, 1.25, 0);
        rollZ = Math.sin(localDeathElapsed * 50) * 0.04 * decay;
      } else if (localDeathElapsed < 1.5) {
        // FLY FORWARD AND SLAM FACE-FIRST ONTO THE TABLETOP DESK!
        const t = (localDeathElapsed - 1.1) / 0.4;
        const ease = Math.pow(t, 2.2);
        // Direct positioning gives crisp hard impact without lerp delay
        snapCamera = true;
        camera.position.set(0, 1.94 - ease * 0.98, 3.15 - ease * 1.05);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
      } else if (localDeathElapsed < 2.1) {
        // Resting face-down on table desk with small damped bounce!
        snapCamera = true;
        const bounceT = Math.min(1, (localDeathElapsed - 1.5) / 0.16);
        const bounce = Math.sin(bounceT * Math.PI) * 0.03 * (1 - bounceT);
        camera.position.set(0, 0.96 + bounce, 2.1);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
      } else if (localDeathElapsed < 2.9) {
        // Slide / roll sideways on table surface!
        snapCamera = true;
        const t = (localDeathElapsed - 2.1) / 0.8;
        const ease = Math.pow(t, 1.8);
        camera.position.set(ease * 0.35, 0.96 - ease * 0.08, 2.1);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
        rollZ = ease * 1.15; // Sideways head roll on table
      } else {
        // Settled ghost / spectator camera elevated above table
        targetPos.set(0, 3.1, 2.65 + mobilePullback);
        targetLook.set(0, 0.85, 0);
      }

      if (!snapCamera) {
        const step = Math.min(1, delta * 7);
        camera.position.lerp(targetPos, step);
        currentLook.current.lerp(targetLook, step);
        camera.lookAt(currentLook.current);
      }

      // CRITICAL: Three.js lookAt recalculates rotation and resets roll to 0.
      // rotateZ MUST be called AFTER lookAt to preserve sideways head tilt!
      if (rollZ !== 0) {
        camera.rotateZ(rollZ);
      }
      return;
    }

    if (isLocalEliminated) {
      // If loaded already eliminated, remain in spectator view
      targetPos.set(0, 3.1, 2.65 + mobilePullback);
      targetLook.set(0, 0.85, 0);
      camera.rotation.z = 0;
      const step = Math.min(1, delta * 5);
      camera.position.lerp(targetPos, step);
      currentLook.current.lerp(targetLook, step);
      camera.lookAt(currentLook.current);
      return;
    }

    if (roomState === 'BluffCheck' || roomState === 'VoltageTest') {
      targetPos.set(yawOffset * 0.5, 2.35, 2.3 + mobilePullback);
      targetLook.set(0, 0.92, 0);
    } else if (focus === 'table') {
      targetPos.set(yawOffset * 0.45, 2.15, 2.65 + mobilePullback);
      targetLook.set(yawOffset * 0.25, 0.9, 0.45);
    } else if (focus === 'opponents') {
      targetPos.set(yawOffset * 1.1, 1.85, 2.9 + mobilePullback);
      targetLook.set(yawOffset * 0.8, 1.22, -1.8);
    } else {
      targetPos.set(yawOffset * 0.75, 1.94, 3.15 + mobilePullback);
      targetLook.set(yawOffset * 0.45, 1.04 + pitchOffset * 0.4, 0.2);
    }

    const step = Math.min(1, delta * 5);
    camera.position.lerp(targetPos, step);
    currentLook.current.lerp(targetLook, step);
    camera.lookAt(currentLook.current);
  });

  return null;
};

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
  const { language, t } = useI18n();
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());
  const [yawOffset, setYawOffset] = useState<number>(0);
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;
    const dx = (e.clientX - pointerStart.current.x) / 220;
    const dy = (pointerStart.current.y - e.clientY) / 260;
    setYawOffset((prev) => Math.max(-0.9, Math.min(0.9, prev + dx)));
    setPitchOffset((prev) => Math.max(-0.45, Math.min(0.45, prev + dy)));
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    pointerStart.current = null;
  };

  return (
    <div
      data-testid="bunker-arena-stage"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative w-full h-full min-h-[100dvh] bg-black overflow-hidden select-none touch-none font-mono"
    >
      {/* Top In-Bounds Visor Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          {topBarSlot}
        </div>

        <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md border border-zinc-800 p-1 rounded-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setYawOffset(0);
              setPitchOffset(0);
              onCameraFocusChange('overview');
            }}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
              cameraFocus === 'overview'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Eye className="w-3 h-3" />
            <span>{language === 'pl' ? 'POV' : 'POV'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setYawOffset(0);
              setPitchOffset(-0.2);
              onCameraFocusChange('table');
            }}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
              cameraFocus === 'table'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Layers className="w-3 h-3" />
            <span>{language === 'pl' ? 'STÓŁ' : 'TABLE'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setYawOffset(0);
              setPitchOffset(0.2);
              onCameraFocusChange('opponents');
            }}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
              cameraFocus === 'opponents'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Camera className="w-3 h-3" />
            <span>{language === 'pl' ? 'RYWALE' : 'RIVALS'}</span>
          </button>
          {dischargeCinematic && onDismissDischarge && (
            <button
              type="button"
              onClick={onDismissDischarge}
              className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              [{t.voltage.dismiss}]
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen WebGL 3D First-Person POV Scene */}
      {webGLSupported ? (
        <div className="absolute inset-0 w-full h-full">
          <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.94, 3.15], fov: 50 }}>
            <color attach="background" args={['#040406']} />
            <fog attach="fog" args={['#040406', 5.2, 12.5]} />

            <CameraController
              focus={cameraFocus}
              roomState={roomState}
              yawOffset={yawOffset}
              pitchOffset={pitchOffset}
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
                onActivateExploit={onActivateExploit}
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

      {/* Locked Bottom-Edge Tactical Visor Action Strip (100% In-Bounds on All Screens) */}
      {roomState !== 'Lobby' && (
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 max-w-4xl mx-auto pointer-events-none">
          <button
            type="button"
            disabled={!canTrace}
            onClick={onCallTrace}
            className={clsx(
              'pointer-events-auto px-3.5 sm:px-5 py-2.5 rounded-xl border font-extrabold text-xs transition-all',
              canTrace
                ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-black border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.75)] cursor-pointer'
                : 'bg-zinc-950/85 border-zinc-800 text-zinc-500 opacity-50 pointer-events-none'
            )}
          >
            🚨 {t.table.callTrace}
          </button>

          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-zinc-800 text-[10px] sm:text-xs">
            <span className={clsx('font-black px-1.5 py-0.5 rounded border', myCharacter.accentBadgeClass)}>
              {`[${myCharacter.codename}]`}
            </span>
            <span className={clsx('font-bold', riskLevel >= 4 ? 'text-red-400' : 'text-amber-400')}>
              ⚡ {riskLevel}/6
            </span>
            {exploit && !exploit.isBurned && (
              <button
                type="button"
                disabled={!canUseChip}
                onClick={() =>
                  canUseChip && onActivateExploit(exploit.type, currentTargetProtocol ?? 'Alpha')
                }
                className={clsx(
                  'px-2 py-0.5 rounded border font-black uppercase transition-all',
                  canUseChip
                    ? 'bg-cyan-400 text-black border-cyan-200 animate-pulse cursor-pointer'
                    : 'bg-zinc-900 border-cyan-900 text-cyan-400 opacity-60'
                )}
              >
                CHIP: {exploit.type}
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!canTransmit}
            onClick={onPlayCards}
            className={clsx(
              'pointer-events-auto px-4 sm:px-6 py-2.5 rounded-xl border font-extrabold text-xs transition-all',
              canTransmit
                ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black border-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.75)] cursor-pointer'
                : 'bg-zinc-950/85 border-zinc-800 text-zinc-500 opacity-50 pointer-events-none'
            )}
          >
            ▶ {t.table.transmitCards}
            {selectedCardIds.length > 0 ? ` (${selectedCardIds.length})` : ''}
          </button>
        </div>
      )}

      {/* In-Arena Tactile Voltage Controls (No Blocking Modal Popups) */}
      {isVoltageTestActive && isLocalPlayerPending && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-lg w-full px-4 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-bold tracking-wider animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.7)] text-center">
            {t.voltage.pendingSelfAlert}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {canUseGroundWire && onDeployGroundWire && (
              <button
                type="button"
                onClick={onDeployGroundWire}
                className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95 transition-all cursor-pointer"
              >
                ⚡ {t.voltage.useGroundWire}
              </button>
            )}
            {onTriggerDischarge && (
              <button
                type="button"
                onClick={onTriggerDischarge}
                className="px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.8)] active:scale-95 transition-all cursor-pointer"
              >
                ⚡ {t.voltage.triggerDischarge} (D6)
              </button>
            )}
          </div>
        </div>
      )}

      {isVoltageTestActive && !isLocalPlayerPending && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-bold tracking-wider animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)] text-center pointer-events-none">
          {pendingPlayerNickname
            ? `${t.voltage.pendingOpponentAlert} [${pendingPlayerNickname}]`
            : t.voltage.pendingOpponentAlert}
        </div>
      )}

      {/* First-Person POV Local Death Glitch Vignette */}
      {isLocalOverloaded && (
        <div
          className={clsx(
            'pointer-events-none absolute inset-0 z-50 transition-opacity duration-300',
            'bg-red-950/40 mix-blend-color-burn animate-pulse shadow-[inset_0_0_120px_rgba(239,68,68,0.9)]'
          )}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono">
            <span className="text-xl sm:text-2xl font-black text-red-500 tracking-widest block animate-pulse">
              ⚡ CRITICAL OVERLOAD // SIGNAL LOST
            </span>
            <span className="text-xs text-zinc-400 tracking-wider">
              FEED REDIRECTED TO SPECTATOR DRONE
            </span>
          </div>
        </div>
      )}

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
