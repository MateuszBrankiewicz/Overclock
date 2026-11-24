import React, { useEffect, useMemo, useState } from 'react';

import { checkWebGLAvailable } from '../../../../shared/lib/webgl';
import { ErrorBoundary } from '../../../../shared/ui/ErrorBoundary';
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
import { type CharacterId, resolveSeatCharacter } from '../../utils/characterCatalog';
import { ArenaFallback } from './ArenaFallback';
import { ArenaHud } from './ArenaHud';
import { ArenaScene3D } from './ArenaScene3D';
import { useExploitPicker } from './hud/useExploitPicker';
import { useArenaFocus } from './useArenaFocus';
import { useArenaFrameloop } from './useArenaFrameloop';
import { useArenaSeats } from './useArenaSeats';
import { useCameraDrag } from './useCameraDrag';
import { useShockState } from './useShockState';

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
  /**
   * Bluff showdown on screen (reveal, voltage test, discharge): hide the hand, action strip and
   * turn HUD so the showdown panel is the only thing asking for attention.
   */
  isOutcomeCinematic?: boolean;
  dischargeCinematic?: DischargeCinematic | null;
  onDismissDischarge?: () => void;
  /** Cards flipped face-up on the table after a trace. */
  revealedCards?: PlayerCard[] | null;
  revealDeclaredProtocol?: CardProtocol | null;
  revealStartedAtMs?: number | null;
  revealLoserPlayerId?: string | null;
  /**
   * Operator facing the voltage test for the whole showdown (pending decision, queued or running
   * discharge, or the trace loser while the server catches up); the leads stay clamped on them.
   */
  voltageTargetPlayerId?: string | null;
  /** Who called TRACE and who is being traced, shown as a targeting beam until the verdict. */
  revealAccuserPlayerId?: string | null;
  revealAccusedPlayerId?: string | null;
  /**
   * `modal`: the centre panel (lobby, summary, intermission) takes touch input and scrolls on
   * small screens. `passive`: it only displays and the table stays draggable around it.
   */
  overlayMode?: 'modal' | 'passive';
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
  isOutcomeCinematic = false,
  dischargeCinematic = null,
  onDismissDischarge,
  revealedCards = null,
  revealDeclaredProtocol = null,
  revealStartedAtMs = null,
  revealLoserPlayerId = null,
  voltageTargetPlayerId = null,
  revealAccuserPlayerId = null,
  revealAccusedPlayerId = null,
  overlayMode = 'passive',
}) => {
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());
  // A WebGL crash at render time (lost context, driver bug) degrades to the 2D table instead of a blank screen.
  const [sceneFailed, setSceneFailed] = useState(false);
  const cameraDrag = useCameraDrag();
  const gfxQuality = useGfxSettings((s) => s.quality);
  const spectatorTargetPlayerId = useGameStore((s) => s.spectatorTargetPlayerId);
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

  const { opponents, seatLayouts, seatHeadPos, seatChestPos } = useArenaSeats(
    players,
    myPlayerId
  );
  const activePlayerNickname = useMemo(
    () => players.find((p) => p.playerId === activePlayerId)?.nickname,
    [players, activePlayerId]
  );

  const shock = useShockState({
    dischargeCinematic,
    myPlayerId,
    pendingDischargePlayerId,
    isEliminated,
    opponents,
    seatLayouts,
  });
  const focus = useArenaFocus({
    players,
    opponents,
    seatLayouts,
    seatHeadPos,
    seatChestPos,
    myPlayerId,
    activePlayerId,
    pendingDischargePlayerId,
    roomState,
    isEliminated,
    spectatorTargetPlayerId,
    lastPlayedCards,
    dischargeCinematic,
    revealedCards,
    revealStartedAtMs,
    revealLoserPlayerId,
    voltageTargetPlayerId,
    revealAccuserPlayerId,
    revealAccusedPlayerId,
  });

  const fallbackScene = (
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
  );

  return (
    <div
      data-testid="bunker-arena-stage"
      {...dragHandlers}
      className="relative w-full h-full min-h-[100dvh] bg-black overflow-hidden select-none font-mono"
    >
      <ArenaHud
        roomState={roomState}
        topBarSlot={topBarSlot}
        cameraFocus={cameraFocus}
        onCameraFocusChange={onCameraFocusChange}
        onPresetSelect={(focusPreset, yaw, pitch) => {
          cameraDrag.reset(yaw, pitch);
          wake();
          onCameraFocusChange(focusPreset);
        }}
        dischargeCinematic={dischargeCinematic}
        onDismissDischarge={onDismissDischarge}
        isOutcomeCinematic={isOutcomeCinematic}
        isMyTurn={isMyTurn}
        isEliminated={isEliminated}
        isShockActive={shock.isShockActive}
        isLocalOverloaded={shock.isLocalOverloaded}
        opponents={opponents}
        myCharacter={myCharacter}
        myCards={myCards}
        selectedCardIds={selectedCardIds}
        tablePileCount={tablePileCount}
        currentTargetProtocol={currentTargetProtocol}
        riskLevel={riskLevel}
        exploit={exploit}
        canActivateExploit={canActivateExploit}
        exploitPicker={exploitPicker}
        onToggleCard={onToggleCard}
        onPlayCards={onPlayCards}
        onCallTrace={onCallTrace}
      >
        {/* Fullscreen WebGL 3D First-Person POV Scene */}
        {webGLSupported && !sceneFailed ? (
          <ErrorBoundary fallback={fallbackScene} onError={() => setSceneFailed(true)}>
            <ArenaScene3D
              frameloop={frameloop}
              shock={shock}
              focus={focus}
              cameraFocus={cameraFocus}
              offsetsRef={cameraDrag.offsetsRef}
              roomState={roomState}
              stageAccentColor={stageAccentColor}
              opponents={opponents}
              seatLayouts={seatLayouts}
              activePlayerId={activePlayerId}
              activePlayerNickname={activePlayerNickname}
              dischargeCinematic={dischargeCinematic}
              tablePileCount={tablePileCount}
              currentTargetProtocol={currentTargetProtocol}
              lastPlayedCards={lastPlayedCards}
              revealedCards={revealedCards}
              revealDeclaredProtocol={revealDeclaredProtocol}
              revealStartedAtMs={revealStartedAtMs}
              isOutcomeCinematic={isOutcomeCinematic}
              isMyTurn={isMyTurn}
              isEliminated={isEliminated}
              riskLevel={riskLevel}
              exploit={exploit}
              canActivateExploit={canActivateExploit}
              myCards={myCards}
              selectedCardIds={selectedCardIds}
              myCharacter={myCharacter}
              onToggleCard={onToggleCard}
              onPlayCards={onPlayCards}
              onCallTrace={onCallTrace}
              onUseChip={exploitPicker.request}
            />
          </ErrorBoundary>
        ) : (
          fallbackScene
        )}
      </ArenaHud>

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
