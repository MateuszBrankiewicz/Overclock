import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { checkWebGLAvailable } from '../../../shared/lib/webgl';
import { useCinematicTimers } from '../hooks/useCinematicTimers';
import { useTablePhase } from '../hooks/useTablePhase';
import { useGameSession } from '../session/useGameSession';
import { useGameStore } from '../stores/useGameStore';
import { BunkerArenaCanvas } from './arena3d/BunkerArenaCanvas';
import { LobbyScreen } from './LobbyScreen';
import { RoundIntroBanner } from './RoundIntroBanner';
import { TableCenterOverlay } from './TableCenterOverlay';
import { TableShowdownPanel } from './TableShowdownPanel';
import { TableTopBar } from './TableTopBar';

export interface OperatingTableProps {
  onOpenTerminal?: () => void;
}

export const OperatingTable: React.FC<OperatingTableProps> = ({ onOpenTerminal }) => {
  const session = useGameSession();
  const { t } = useI18n();
  // Same check as BunkerArenaCanvas: without WebGL the showdown bar shows the cards itself.
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());

  const roomCode = useGameStore((s) => s.roomCode);
  const roomState = useGameStore((s) => s.roomState);
  const playerId = useGameStore((s) => s.playerId);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const currentTargetProtocol = useGameStore((s) => s.currentTargetProtocol);
  const tablePileCount = useGameStore((s) => s.tablePileCount);
  const myCards = useGameStore((s) => s.myCards);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const lastPlayedCards = useGameStore((s) => s.lastPlayedCards);
  const traceReveal = useGameStore((s) => s.traceReveal);
  const roundIntro = useGameStore((s) => s.roundIntro);
  const clearRoundIntro = useGameStore((s) => s.clearRoundIntro);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const canActivateExploit = useGameStore((s) => s.canActivateExploit);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const clearDischargeCinematic = useGameStore((s) => s.clearDischargeCinematic);
  const sniffedCard = useGameStore((s) => s.sniffedCard);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const cameraFocus = useGameStore((s) => s.cameraFocus);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);

  useCinematicTimers();
  const table = useTablePhase();
  const { players, me, phase, centerOverlay, isShowdown, showdownTargetId } = table;
  const revealResolution = traceReveal?.resolution ?? null;

  if (!roomCode) {
    return <LobbyScreen onOpenTerminal={onOpenTerminal} />;
  }

  /* Fullscreen First-Person 3D POV Table View (Zero Website Clutter) */
  return (
    <div className="fixed inset-0 z-40 w-screen h-[100dvh] bg-black overflow-hidden font-mono">
      {/* Packet Sniffer Visor HUD Alert */}
      {sniffedCard && (
        <div className="fixed top-24 sm:top-16 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 w-max max-w-[92vw] px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-[11px] sm:text-xs text-cyan-200 text-center pointer-events-none">
          <span>⚡ {t.table.packetSnifferAlert}</span>
          <span className="px-2 py-0.5 rounded font-black text-black bg-cyan-400">
            {sniffedCard.protocol}
          </span>
        </div>
      )}

      {roundIntro && roundIntro.roundNumber === 1 && phase === null && (
        <RoundIntroBanner
          key={`${roundIntro.roundNumber}:${roundIntro.startedAtMs}`}
          roundNumber={roundIntro.roundNumber}
          protocol={roundIntro.protocol}
          startedAtMs={roundIntro.startedAtMs}
          onDone={clearRoundIntro}
        />
      )}

      {isShowdown && (
        <TableShowdownPanel
          phase={phase}
          targetId={showdownTargetId}
          canUseGroundWire={table.canUseGroundWire}
          webGLSupported={webGLSupported}
          toOperator={table.toOperator}
        />
      )}

      <BunkerArenaCanvas
        players={players}
        isOutcomeCinematic={isShowdown}
        myPlayerId={playerId}
        activePlayerId={activePlayerId}
        pendingDischargePlayerId={pendingDischargePlayerId}
        selectedCharacterId={selectedCharacterId}
        tablePileCount={tablePileCount}
        currentTargetProtocol={currentTargetProtocol}
        roomState={phase === 'reveal' ? 'BluffCheck' : roomState}
        revealedCards={revealResolution?.revealedCards ?? null}
        revealDeclaredProtocol={revealResolution?.declaredProtocol ?? null}
        revealStartedAtMs={traceReveal?.startedAtMs ?? null}
        revealLoserPlayerId={
          revealResolution
            ? revealResolution.bluffDetected
              ? revealResolution.accusedPlayerId
              : revealResolution.accuserPlayerId
            : null
        }
        voltageTargetPlayerId={showdownTargetId}
        revealAccuserPlayerId={revealResolution?.accuserPlayerId ?? null}
        revealAccusedPlayerId={revealResolution?.accusedPlayerId ?? null}
        lastPlayedCards={lastPlayedCards}
        cameraFocus={cameraFocus}
        onCameraFocusChange={setCameraFocus}
        myCards={myCards}
        selectedCardIds={selectedCardIds}
        isMyTurn={table.isMyTurn}
        isEliminated={table.isEliminated}
        riskLevel={me?.riskLevel ?? 1}
        exploit={me?.exploit}
        canActivateExploit={canActivateExploit}
        onToggleCard={toggleCardSelection}
        onPlayCards={() => void session.playCards()}
        onCallTrace={() => void session.callTrace()}
        onActivateExploit={(exp, newTarget) => void session.activateExploit(exp, newTarget)}
        overlayMode={centerOverlay !== null ? 'modal' : 'passive'}
        dischargeCinematic={dischargeCinematic}
        onDismissDischarge={clearDischargeCinematic}
        topBarSlot={<TableTopBar roomCode={roomCode} />}
      >
        <TableCenterOverlay
          overlay={centerOverlay}
          roomCode={roomCode} players={players} isHost={table.isHost} />
      </BunkerArenaCanvas>
    </div>
  );
};
