import { HelpCircle } from 'lucide-react';
import React, { useEffect } from 'react';

import { useI18n } from '../../../shared/i18n';
import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { useRulesModalStore } from '../stores/useRulesModalStore';
import { resolveCenterOverlay } from '../utils/centerOverlay';
import {
  AWAIT_DISCHARGE_TIMEOUT_MS,
  dischargeCinematicDurationMs,
  traceRevealDurationMs,
} from '../utils/cinematicTiming';
import { resolveOutcomePhase } from '../utils/outcomePhase';
import { BunkerArenaCanvas } from './arena3d/BunkerArenaCanvas';
import { ConnectionStatusPill } from './ConnectionStatusPill';
import { EventFeed } from './EventFeed';
import { LeaveTableButton } from './LeaveTableButton';
import { LobbyPlayerList } from './LobbyPlayerList';
import { LobbyScreen } from './LobbyScreen';
import { MatchSummary } from './MatchSummary';
import { RoomCodeBadge } from './RoomCodeBadge';
import { RoundIntermissionBanner } from './RoundIntermissionBanner';
import { RoundIntroBanner } from './RoundIntroBanner';

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
  const livePlayers = useGameStore((s) => s.players);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const currentTargetProtocol = useGameStore((s) => s.currentTargetProtocol);
  const tablePileCount = useGameStore((s) => s.tablePileCount);
  const myCards = useGameStore((s) => s.myCards);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const lastPlayedCards = useGameStore((s) => s.lastPlayedCards);
  const traceReveal = useGameStore((s) => s.traceReveal);
  const finishTraceReveal = useGameStore((s) => s.finishTraceReveal);
  const roundIntro = useGameStore((s) => s.roundIntro);
  const clearRoundIntro = useGameStore((s) => s.clearRoundIntro);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const canActivateExploit = useGameStore((s) => s.canActivateExploit);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const lastDischargeOutcome = useGameStore((s) => s.lastDischargeOutcome);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const clearDischargeCinematic = useGameStore((s) => s.clearDischargeCinematic);
  const queuedDischarge = useGameStore((s) => s.queuedDischarge);
  const awaitingDischargeForSequence = useGameStore((s) => s.awaitingDischargeForSequence);
  const clearAwaitingDischarge = useGameStore((s) => s.clearAwaitingDischarge);
  const sniffedCard = useGameStore((s) => s.sniffedCard);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const characterByPlayerId = useGameStore((s) => s.characterByPlayerId);
  const cameraFocus = useGameStore((s) => s.cameraFocus);
  const setSelectedCharacter = useGameStore((s) => s.setSelectedCharacter);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);

  // Presentation order after a trace: card reveal -> discharge on the operator -> next-round countdown.
  useEffect(() => {
    if (!traceReveal) return;
    const remaining =
      traceRevealDurationMs(traceReveal.resolution.revealedCards.length) -
      (Date.now() - traceReveal.startedAtMs);
    const timer = setTimeout(finishTraceReveal, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [traceReveal, finishTraceReveal]);

  // Auto-dismiss discharge cinematic using exact duration (including death kinematic)
  useEffect(() => {
    if (!dischargeCinematic) return;
    const duration = dischargeCinematicDurationMs(dischargeCinematic.event.overloaded);
    const remaining = duration - (Date.now() - dischargeCinematic.startedAtMs);
    const timer = setTimeout(clearDischargeCinematic, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [dischargeCinematic, clearDischargeCinematic]);

  // Safety watchdog: clear awaitingDischarge if network or server drops discharge event
  useEffect(() => {
    if (awaitingDischargeForSequence === null) return;
    const timer = setTimeout(clearAwaitingDischarge, AWAIT_DISCHARGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [awaitingDischargeForSequence, clearAwaitingDischarge]);

  // While the cards are being revealed, show the table as it was when the trace was called.
  const players = traceReveal?.seatsAtReveal ?? livePlayers;

  const me = players.find((p) => p.playerId === playerId);
  const pendingPlayer = players.find((p) => p.playerId === pendingDischargePlayerId);
  const isLocalPlayerPending = Boolean(playerId && pendingDischargePlayerId === playerId);
  const canUseGroundWire = Boolean(
    isLocalPlayerPending && me?.exploit?.type === 'GroundWire' && !me.exploit.isBurned
  );
  const isEliminated = me?.status === 'Eliminated';
  const isMyTurn = Boolean(activePlayerId && playerId && activePlayerId === playerId && !isEliminated);
  const isHost = Boolean(hostId && playerId && hostId === playerId);

  const revealResolution = traceReveal?.resolution ?? null;
  const phase = resolveOutcomePhase({
    roomState,
    hasTraceReveal: Boolean(traceReveal),
    hasQueuedDischarge: Boolean(queuedDischarge),
    hasDischargeCinematic: Boolean(dischargeCinematic),
    awaitingDischarge: Boolean(awaitingDischargeForSequence !== null),
  });
  const centerOverlay = resolveCenterOverlay({
    roomState,
    phase,
  });
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

      {roomState !== 'Lobby' && <EventFeed />}

      {roundIntro && phase === null && (
        <RoundIntroBanner
          key={`${roundIntro.roundNumber}:${roundIntro.startedAtMs}`}
          roundNumber={roundIntro.roundNumber}
          protocol={roundIntro.protocol}
          startedAtMs={roundIntro.startedAtMs}
          onDone={clearRoundIntro}
        />
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
        roomState={phase === 'reveal' ? 'BluffCheck' : roomState}
        revealedCards={revealResolution?.revealedCards ?? null}
        revealDeclaredProtocol={revealResolution?.declaredProtocol ?? null}
        revealStartedAtMs={traceReveal?.startedAtMs ?? null}
        bluffDetected={revealResolution?.bluffDetected ?? false}
        revealLoserPlayerId={
          revealResolution
            ? revealResolution.bluffDetected
              ? revealResolution.accusedPlayerId
              : revealResolution.accuserPlayerId
            : null
        }
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
        isVoltageTestActive={phase === 'decision'}
        overlayMode={centerOverlay !== null ? 'modal' : 'passive'}
        dischargeCinematic={dischargeCinematic}
        pendingPlayerNickname={pendingPlayer?.nickname ?? t.common.operator}
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
            <LeaveTableButton onLeave={() => void session.leaveRoom()} />
          </div>
        }
      >
        {centerOverlay === 'lobby' ? (
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
        ) : centerOverlay === 'summary' ? (
          <MatchSummary
            players={players}
            placementByPlayerId={placementByPlayerId}
            winnerId={winnerId}
            myPlayerId={playerId}
            roundNumber={roundNumber}
            isHost={isHost}
            onPlayAgain={() => void session.startRound()}
            onLeave={() => void session.leaveRoom()}
          />
        ) : centerOverlay === 'intermission' ? (
          <RoundIntermissionBanner
            key={roundNumber}
            roundNumber={roundNumber}
            players={players}
            lastDischargeOutcome={lastDischargeOutcome}
            isHost={isHost}
            hostId={hostId}
            myPlayerId={playerId}
            onLeave={() => void session.leaveRoom()}
            isDischargeCinematicActive={false}
            onStartNextRound={() => void session.startRound()}
          />
        ) : null}
      </BunkerArenaCanvas>
    </div>
  );
};
