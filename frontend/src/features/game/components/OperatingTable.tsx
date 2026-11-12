import { HelpCircle } from 'lucide-react';
import React, { useEffect } from 'react';

import { useI18n } from '../../../shared/i18n';
import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { useRulesModalStore } from '../stores/useRulesModalStore';
import { BunkerArenaCanvas } from './arena3d/BunkerArenaCanvas';
import { CardRevealSequence } from './CardRevealSequence';
import { ConnectionStatusPill } from './ConnectionStatusPill';
import { LeaveTableButton } from './LeaveTableButton';
import { LobbyPlayerList } from './LobbyPlayerList';
import { LobbyScreen } from './LobbyScreen';
import { MatchSummary } from './MatchSummary';
import { RoomCodeBadge } from './RoomCodeBadge';
import { RoundIntermissionBanner } from './RoundIntermissionBanner';

export const OperatingTable: React.FC = () => {
  const session = useGameSession();
  const { t } = useI18n();

  const openRules = useRulesModalStore((s) => s.open);

  const roomCode = useGameStore((s) => s.roomCode);
  const roomState = useGameStore((s) => s.roomState);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const winnerId = useGameStore((s) => s.winnerId);
  const placementByPlayerId = useGameStore((s) => s.placementByPlayerId);
  const players = useGameStore((s) => s.players);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const currentTargetProtocol = useGameStore((s) => s.currentTargetProtocol);
  const tablePileCount = useGameStore((s) => s.tablePileCount);
  const myCards = useGameStore((s) => s.myCards);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const lastPlayedCards = useGameStore((s) => s.lastPlayedCards);
  const lastTraceResolution = useGameStore((s) => s.lastTraceResolution);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const canActivateExploit = useGameStore((s) => s.canActivateExploit);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const lastDischargeOutcome = useGameStore((s) => s.lastDischargeOutcome);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const clearDischargeCinematic = useGameStore((s) => s.clearDischargeCinematic);
  const sniffedCard = useGameStore((s) => s.sniffedCard);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const characterByPlayerId = useGameStore((s) => s.characterByPlayerId);
  const cameraFocus = useGameStore((s) => s.cameraFocus);
  const setSelectedCharacter = useGameStore((s) => s.setSelectedCharacter);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);

  // Auto-clear discharge cinematic after 3.6s animation completes
  useEffect(() => {
    if (!dischargeCinematic) return;
    const timer = setTimeout(() => {
      clearDischargeCinematic();
    }, 3600);
    return () => clearTimeout(timer);
  }, [dischargeCinematic, clearDischargeCinematic]);

  const me = players.find((p) => p.playerId === playerId);
  const pendingPlayer = players.find((p) => p.playerId === pendingDischargePlayerId);
  const isLocalPlayerPending = Boolean(playerId && pendingDischargePlayerId === playerId);
  const canUseGroundWire = Boolean(
    isLocalPlayerPending && me?.exploit?.type === 'GroundWire' && !me.exploit.isBurned
  );
  const isEliminated = me?.status === 'Eliminated';
  const isMyTurn = Boolean(activePlayerId && playerId && activePlayerId === playerId && !isEliminated);
  const isHost = Boolean(hostId && playerId && hostId === playerId);

  const accuserNickname =
    players.find((p) => p.playerId === lastTraceResolution?.accuserPlayerId)?.nickname ?? 'Player';
  const accusedNickname =
    players.find((p) => p.playerId === lastTraceResolution?.accusedPlayerId)?.nickname ?? 'Opponent';
  if (!roomCode) {
    return <LobbyScreen />;
  }

  /* Fullscreen First-Person 3D POV Table View (Zero Website Clutter) */
  return (
    <div className="fixed inset-0 z-40 w-screen h-[100dvh] bg-black overflow-hidden font-mono">
      {/* Packet Sniffer Visor HUD Alert */}
      {sniffedCard && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-xs text-cyan-200 pointer-events-none">
          <span>⚡ {t.table.packetSnifferAlert}</span>
          <span className="px-2 py-0.5 rounded font-black text-black bg-cyan-400">
            {sniffedCard.protocol}
          </span>
        </div>
      )}

      <BunkerArenaCanvas
        players={players}
        myPlayerId={playerId}
        activePlayerId={activePlayerId}
        pendingDischargePlayerId={pendingDischargePlayerId}
        selectedCharacterId={selectedCharacterId}
        characterByPlayerId={characterByPlayerId}
        tablePileCount={tablePileCount}
        currentTargetProtocol={currentTargetProtocol}
        roomState={roomState}
        lastPlayedCards={lastPlayedCards}
        cameraFocus={cameraFocus}
        onCameraFocusChange={setCameraFocus}
        myCards={myCards}
        selectedCardIds={selectedCardIds}
        isMyTurn={isMyTurn}
        isEliminated={isEliminated}
        riskLevel={me?.riskLevel ?? 1}
        exploit={me?.exploit}
        canActivateExploit={canActivateExploit}
        onToggleCard={toggleCardSelection}
        onPlayCards={() => void session.playCards()}
        onCallTrace={() => void session.callTrace()}
        onActivateExploit={(exp, newTarget) => void session.activateExploit(exp, newTarget)}
        isVoltageTestActive={roomState === 'VoltageTest'}
        dischargeCinematic={dischargeCinematic}
        pendingPlayerNickname={pendingPlayer?.nickname ?? 'Operator'}
        isLocalPlayerPending={isLocalPlayerPending}
        canUseGroundWire={canUseGroundWire}
        onDeployGroundWire={() => void session.activateExploit('GroundWire')}
        onTriggerDischarge={() => void session.triggerDischarge()}
        onDismissDischarge={clearDischargeCinematic}
        topBarSlot={
          <div className="flex flex-wrap items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <RoomCodeBadge roomCode={roomCode} showInviteLink={roomState !== 'Lobby'} />
            <ConnectionStatusPill />
            <button
              type="button"
              onClick={openRules}
              className="p-1 text-zinc-400 hover:text-emerald-300 cursor-pointer"
              title={t.common.gameRules}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <LeaveTableButton onLeave={() => session.leaveRoom()} />
          </div>
        }
      >
        {roomState === 'Lobby' ? (
          <LobbyPlayerList
            players={players}
            myPlayerId={playerId}
            hostId={hostId}
            roomCode={roomCode}
            isHost={isHost}
            selectedCharacterId={selectedCharacterId}
            characterByPlayerId={characterByPlayerId}
            onSelectCharacter={setSelectedCharacter}
            onSetReady={(ready) => void session.setReady(ready)}
            onStartRound={() => void session.startRound()}
          />
        ) : roomState === 'GameOver' && !dischargeCinematic ? (
          <MatchSummary
            players={players}
            placementByPlayerId={placementByPlayerId}
            winnerId={winnerId}
            myPlayerId={playerId}
            roundNumber={roundNumber}
            isHost={isHost}
            onPlayAgain={() => void session.startRound()}
            onLeave={() => session.leaveRoom()}
          />
        ) : roomState === 'BluffCheck' ? (
          <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-3 pointer-events-none">
            <CardRevealSequence
              revealedCards={lastTraceResolution?.revealedCards ?? []}
              declaredProtocol={
                lastTraceResolution?.declaredProtocol ?? (currentTargetProtocol ?? 'Alpha')
              }
              bluffDetected={lastTraceResolution?.bluffDetected ?? false}
              accuserNickname={accuserNickname}
              accusedNickname={accusedNickname}
            />
          </div>
        ) : roomState === 'RoundOver' ? (
          <RoundIntermissionBanner
            key={roundNumber}
            roundNumber={roundNumber}
            players={players}
            lastDischargeOutcome={lastDischargeOutcome}
            isHost={isHost}
            hostId={hostId}
            myPlayerId={playerId}
            onLeave={() => session.leaveRoom()}
            isDischargeCinematicActive={Boolean(dischargeCinematic)}
            onStartNextRound={() => void session.startRound()}
          />
        ) : null}
      </BunkerArenaCanvas>
    </div>
  );
};
