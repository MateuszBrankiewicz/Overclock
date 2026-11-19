import { HelpCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { prefersReducedMotion } from '../../../shared/lib/motion';
import { checkWebGLAvailable } from '../../../shared/lib/webgl';
import { useGameSession } from '../session/useGameSession';
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
import { AudioMuteButton } from './AudioMuteButton';
import { ConnectionStatusPill } from './ConnectionStatusPill';
import { GfxQualityButton } from './GfxQualityButton';
import { LeaveTableButton } from './LeaveTableButton';
import { LobbyPlayerList } from './LobbyPlayerList';
import { LobbyScreen } from './LobbyScreen';
import { MatchSummary } from './MatchSummary';
import { RoomCodeBadge } from './RoomCodeBadge';
import { RoundIntermissionBanner } from './RoundIntermissionBanner';
import { RoundIntroBanner } from './RoundIntroBanner';
import { BluffShowdown } from './showdown/BluffShowdown';
import type { ShowdownOperator } from './showdown/showdownParts';
import { VoiceToggleButton } from './VoiceToggleButton';

export interface OperatingTableProps {
  onOpenTerminal?: () => void;
}

export const OperatingTable: React.FC<OperatingTableProps> = ({ onOpenTerminal }) => {
  const session = useGameSession();
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Same check as BunkerArenaCanvas: without WebGL the showdown bar shows the cards itself.
  const [webGLSupported] = useState<boolean>(() => checkWebGLAvailable());

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
  const showdownTrace = useGameStore((s) => s.showdownTrace);
  const dischargeDeadlineUtc = useGameStore((s) => s.dischargeDeadlineUtc);
  const finishTraceReveal = useGameStore((s) => s.finishTraceReveal);
  const roundIntro = useGameStore((s) => s.roundIntro);
  const clearRoundIntro = useGameStore((s) => s.clearRoundIntro);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const intermissionDeadlineUtc = useGameStore((s) => s.intermissionDeadlineUtc);
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
  const cameraFocus = useGameStore((s) => s.cameraFocus);
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
    const duration = dischargeCinematicDurationMs(
      dischargeCinematic.event.overloaded,
      prefersReducedMotion()
    );
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

  // Space key skip for trace reveal & discharge cinematics (UX-06)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (traceReveal) {
          e.preventDefault();
          finishTraceReveal();
        } else if (dischargeCinematic) {
          e.preventDefault();
          clearDischargeCinematic();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [traceReveal, finishTraceReveal, dischargeCinematic, clearDischargeCinematic]);

  // For rounds > 1, the upcoming round is announced in RoundIntermissionBanner
  useEffect(() => {
    if (roundIntro && roundIntro.roundNumber > 1) {
      clearRoundIntro();
    }
  }, [roundIntro, clearRoundIntro]);

  // While the cards are being revealed, show the table as it was when the trace was called.
  const players = traceReveal?.seatsAtReveal ?? livePlayers;

  const me = players.find((p) => p.playerId === playerId);
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
  // Reveal, voltage test decision and discharge are one sequence shown by one panel.
  const isShowdown = phase === 'reveal' || phase === 'decision' || phase === 'discharge';
  const showdownTargetId =
    dischargeCinematic?.event.playerId ??
    pendingDischargePlayerId ??
    queuedDischarge?.playerId ??
    showdownTrace?.loserPlayerId ??
    null;
  const toOperator = (id: string): ShowdownOperator => {
    const seat = players.find((p) => p.playerId === id);
    return {
      nickname: seat?.nickname ?? t.common.operator,
      isLocal: id === playerId,
      characterId: seat?.characterId,
      riskLevel: seat?.riskLevel ?? 1,
    };
  };
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
        <BluffShowdown
          trace={
            showdownTrace
              ? {
                  accuser: toOperator(showdownTrace.accuserPlayerId),
                  accused: toOperator(showdownTrace.accusedPlayerId),
                  declaredProtocol: showdownTrace.declaredProtocol,
                  cards: showdownTrace.revealedCards,
                  bluffDetected: showdownTrace.bluffDetected,
                }
              : null
          }
          revealStartedAtMs={traceReveal?.startedAtMs ?? null}
          discharge={
            dischargeCinematic
              ? {
                  startedAtMs: dischargeCinematic.startedAtMs,
                  roll: dischargeCinematic.event.roll,
                  riskLevel: dischargeCinematic.event.riskLevel,
                  overloaded: dischargeCinematic.event.overloaded,
                  resultingRiskLevel: dischargeCinematic.event.resultingRiskLevel,
                }
              : null
          }
          target={showdownTargetId ? toOperator(showdownTargetId) : null}
          decision={
            phase === 'decision'
              ? {
                  deadlineUtc: dischargeDeadlineUtc,
                  canUseGroundWire,
                  onDeployGroundWire: () => void session.activateExploit('GroundWire'),
                  onTriggerDischarge: () => void session.triggerDischarge(),
                }
              : null
          }
          onSkip={
            traceReveal ? finishTraceReveal : dischargeCinematic ? clearDischargeCinematic : undefined
          }
          variant={webGLSupported ? 'bar' : 'expanded'}
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
        isMyTurn={isMyTurn}
        isEliminated={isEliminated}
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
        topBarSlot={
          <div className="relative flex items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <RoomCodeBadge roomCode={roomCode} showInviteLink={roomState !== 'Lobby'} />
            <ConnectionStatusPill />
            {/* Desktop action icons */}
            <div className="hidden sm:flex items-center gap-2">
              <AudioMuteButton />
              <VoiceToggleButton />
              <GfxQualityButton />
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
            {/* Mobile overflow button */}
            <button
              type="button"
              data-testid="top-bar-overflow-btn"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="sm:hidden p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer text-base leading-none font-bold"
              aria-label="More options"
            >
              ⋯
            </button>
            {/* Mobile popover dropdown */}
            {isMobileMenuOpen && (
              <div
                data-testid="top-bar-mobile-menu"
                className="absolute top-full mt-2 left-0 z-50 flex items-center gap-2 bg-black/95 backdrop-blur-lg border border-zinc-700 p-2 rounded-xl shadow-2xl sm:hidden"
              >
                <AudioMuteButton />
                <VoiceToggleButton />
                <GfxQualityButton />
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openRules();
                  }}
                  className="p-1 text-zinc-400 hover:text-emerald-300 cursor-pointer"
                  title={t.common.gameRules}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <LeaveTableButton onLeave={() => void session.leaveRoom()} />
              </div>
            )}
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
            onSelectCharacter={(id) => void session.selectCharacter(id)}
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
            intermissionDeadlineUtc={intermissionDeadlineUtc}
          />
        ) : null}
      </BunkerArenaCanvas>
    </div>
  );
};
