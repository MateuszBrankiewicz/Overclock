import React from 'react';

import { useI18n } from '../../../../shared/i18n';
import { useFinePointer } from '../../../../shared/lib/motion';
import type {
  CardProtocol,
  ExploitModule,
  PlayerCard,
  PlayerSeat,
  RoomState,
} from '../../schemas/gameEvents';
import type { ArenaCameraFocus, DischargeCinematic } from '../../stores/types';
import { useGameStore } from '../../stores/useGameStore';
import { useUiStore } from '../../stores/useUiStore';
import type { CharacterProfile } from '../../utils/characterCatalog';
import { EventFeed } from '../EventFeed';
import { ActionStrip } from './hud/ActionStrip';
import { CameraPresetBar } from './hud/CameraPresetBar';
import { CardMarkLegend } from './hud/CardMarkLegend';
import { FirstTurnHint } from './hud/FirstTurnHint';
import { useFirstTurnHint } from './hud/firstTurnHint';
import { HotkeyCheatSheet } from './hud/HotkeyCheatSheet';
import { mustCallTrace } from './hud/mustCallTrace';
import { OverloadVignette } from './hud/OverloadVignette';
import { PhaseTimers } from './hud/PhaseTimers';
import { SpectatorHud } from './hud/SpectatorHud';
import { YourTurnBanner } from './hud/TurnStatusHud';
import { TurnUrgencyCountdown } from './hud/TurnUrgencyCountdown';
import { useArenaHotkeys } from './hud/useArenaHotkeys';
import type { useExploitPicker } from './hud/useExploitPicker';

export interface ArenaHudProps {
  roomState: RoomState | null;
  topBarSlot: React.ReactNode;
  cameraFocus: ArenaCameraFocus;
  onCameraFocusChange: (focus: ArenaCameraFocus) => void;
  onPresetSelect: (focus: ArenaCameraFocus, yaw?: number, pitch?: number) => void;
  dischargeCinematic: DischargeCinematic | null;
  onDismissDischarge?: () => void;
  isOutcomeCinematic: boolean;
  isMyTurn: boolean;
  isEliminated: boolean;
  isShockActive: boolean;
  isLocalOverloaded: boolean;
  opponents: PlayerSeat[];
  myCharacter: CharacterProfile;
  myCards: PlayerCard[];
  selectedCardIds: string[];
  tablePileCount: number;
  currentTargetProtocol: CardProtocol | null;
  riskLevel: number;
  exploit: ExploitModule | null;
  canActivateExploit: boolean;
  exploitPicker: ReturnType<typeof useExploitPicker>;
  onToggleCard: (cardId: string) => void;
  onPlayCards: () => void;
  onCallTrace: () => void;
  /** The 3D scene (or its fallback), layered between the top bar and the rest of the HUD. */
  children?: React.ReactNode;
}

/** 2D overlay on top of the 3D stage: top bar, action strip, hints, timers and live announcements. */
export const ArenaHud: React.FC<ArenaHudProps> = (p) => {
  const { t } = useI18n();
  const { roomState, isMyTurn, isEliminated, isOutcomeCinematic, dischargeCinematic } = p;
  const spectatorTargetPlayerId = useGameStore((s) => s.spectatorTargetPlayerId);
  const setSpectatorTarget = useGameStore((s) => s.setSpectatorTarget);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const rulesOpen = useUiStore((s) => s.isRulesOpen);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.playerId);
  const lastPlayerId = useGameStore((s) => s.lastPlayedCards?.playerId);
  const showKeyHints = useFinePointer();
  const firstTurnHint = useFirstTurnHint(isMyTurn && !isEliminated, roomState);

  const isLastHolder =
    isMyTurn && mustCallTrace(players, myPlayerId, lastPlayerId, p.tablePileCount);
  const canTransmit = isMyTurn && !isEliminated && !isLastHolder && p.selectedCardIds.length > 0;
  const canTrace = isMyTurn && !isEliminated && p.tablePileCount > 0;
  const canUseChip = Boolean(p.canActivateExploit && p.exploit && !p.exploit.isBurned);

  const hotkeys = useArenaHotkeys({
    enabled: roomState !== 'Lobby' && roomState !== 'GameOver' && !isEliminated && !rulesOpen,
    canTransmit,
    canTrace,
    canUseChip,
    cardIds: p.myCards.map((c) => c.id),
    selectedCardIds: p.selectedCardIds,
    exploit: p.exploit,
    picker: p.exploitPicker,
    onToggleCard: p.onToggleCard,
    onClearSelection: clearSelection,
    onPlayCards: p.onPlayCards,
    onCallTrace: p.onCallTrace,
  });

  return (
    <>
      {/* Top In-Bounds Visor Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-1.5 pointer-events-none">
        <div className="relative z-20 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2 max-w-full">
            {p.topBarSlot}
          </div>

          <CameraPresetBar
            cameraFocus={p.cameraFocus}
            showDismiss={Boolean(dischargeCinematic)}
            onDismissDischarge={p.onDismissDischarge}
            onSelect={p.onPresetSelect}
          />
        </div>

        <div className="relative z-10 flex flex-col items-start gap-1.5 max-w-[min(78vw,20rem)] sm:max-w-[min(90vw,20rem)]">
          <div className="pointer-events-auto">
            <PhaseTimers roomState={isOutcomeCinematic ? null : roomState} />
          </div>
          {roomState !== 'Lobby' && <EventFeed />}
        </div>
      </div>

      <YourTurnBanner isMyTurn={isMyTurn && !isOutcomeCinematic} />

      {p.children}

      {/* Atmospheric vignette framing the bunker arena */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,4,6,0.65)_100%)]"
      />

      {roomState !== 'Lobby' && !isEliminated && !isOutcomeCinematic && (
        <ActionStrip
          canTrace={canTrace}
          mustCallTrace={isLastHolder}
          canTransmit={canTransmit}
          canUseChip={canUseChip}
          exploit={p.exploit}
          riskLevel={p.riskLevel}
          myCharacter={p.myCharacter}
          selectedCount={p.selectedCardIds.length}
          currentTargetProtocol={p.currentTargetProtocol}
          picker={p.exploitPicker}
          onCallTrace={p.onCallTrace}
          onPlayCards={p.onPlayCards}
          showKeyHints={showKeyHints}
        />
      )}

      {roomState !== 'Lobby' && isEliminated && roomState !== 'GameOver' && !isOutcomeCinematic && (
        <SpectatorHud
          livingOpponents={p.opponents.filter((o) => o.status === 'Active')}
          currentTargetId={spectatorTargetPlayerId}
          cameraFocus={p.cameraFocus}
          onSelectTarget={setSpectatorTarget}
          onSelectFocus={p.onCameraFocusChange}
        />
      )}

      {roomState !== 'Lobby' &&
        !isOutcomeCinematic &&
        p.myCards.length > 0 &&
        !isEliminated && <CardMarkLegend />}
      <FirstTurnHint
        visible={
          firstTurnHint.visible && p.selectedCardIds.length === 0 && !isOutcomeCinematic
        }
        onDismiss={firstTurnHint.dismiss}
      />
      <HotkeyCheatSheet open={hotkeys.helpOpen} onClose={hotkeys.closeHelp} />

      {roomState === 'TurnActive' && <TurnUrgencyCountdown isMyTurn={isMyTurn && !isEliminated} />}

      {p.isLocalOverloaded && p.isShockActive && <OverloadVignette />}

      {/* Screen Reader Live Telemetry Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {dischargeCinematic && p.isShockActive
          ? `${
              dischargeCinematic.event.overloaded
                ? t.voltage.criticalOverload
                : t.voltage.dischargeComplete
            }. ${t.voltage.rollResult}: ${dischargeCinematic.event.roll}, ${
              t.voltage.testedRisk
            }: ${dischargeCinematic.event.riskLevel}.`
          : ''}
      </div>
    </>
  );
};
