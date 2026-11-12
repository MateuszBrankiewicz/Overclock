import clsx from 'clsx';
import { HelpCircle, LogIn, LogOut, PlusCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { BunkerArenaCanvas } from './arena3d/BunkerArenaCanvas';
import { CardRevealSequence } from './CardRevealSequence';
import { CharacterSelector } from './CharacterSelector';
import { ConnectionStatusPill } from './ConnectionStatusPill';
import { GameRulesModal } from './GameRulesModal';
import { LobbyPlayerList } from './LobbyPlayerList';
import { RoomCodeBadge } from './RoomCodeBadge';
import { RoundIntermissionBanner } from './RoundIntermissionBanner';

export const OperatingTable: React.FC = () => {
  const session = useGameSession();
  const { t } = useI18n();

  const [nickname, setNickname] = useState(() => 'Player_' + Math.floor(Math.random() * 900 + 100));
  const [targetCode, setTargetCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        return roomParam.toUpperCase();
      }
    }
    return '';
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const roomCode = useGameStore((s) => s.roomCode);
  const roomState = useGameStore((s) => s.roomState);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const winnerId = useGameStore((s) => s.winnerId);
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
  const winnerNickname =
    players.find((p) => p.playerId === winnerId)?.nickname ??
    (winnerId === playerId ? 'YOU' : 'Operator');

  if (!roomCode) {
    return (
      <div className="w-full max-w-3xl mx-auto font-mono text-emerald-400 bg-zinc-950/95 border border-zinc-800 rounded-xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5">
        <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
          <div>
            <h2 className="font-extrabold tracking-widest text-emerald-300 text-sm">
              {t.lobby.title}
            </h2>
            <span className="text-[10px] text-zinc-500 uppercase">
              HARDWARE TERMINAL // DECK SETUP
            </span>
          </div>
          <span className="text-xs text-zinc-500">NET: {session.connectionStatus}</span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">{t.lobby.subtitle}</p>

        {session.lastLog && (
          <div
            className={clsx(
              'p-2.5 rounded text-xs border font-mono',
              /error|failed|violation|invalid|rejected/i.test(session.lastLog)
                ? 'bg-red-950/60 border-red-800/80 text-red-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
            )}
          >
            {session.lastLog}
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
            <label className="block text-zinc-300 mb-1.5 font-bold">
              {t.lobby.operatorNick}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-black border border-zinc-700 px-3.5 py-2 rounded text-emerald-300 focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div className="bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800">
            <CharacterSelector
              selectedId={selectedCharacterId}
              onSelect={setSelectedCharacter}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col justify-between p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/15 space-y-3">
              <div>
                <span className="flex items-center gap-1.5 font-extrabold text-emerald-300 text-sm">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  {t.lobby.createTable}
                </span>
                <p className="text-[11px] text-zinc-400 mt-1">{t.lobby.createTableDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => void session.createRoom(nickname, targetCode || undefined)}
                className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs"
              >
                [{t.lobby.createTable} // INITIALIZE TABLE]
              </button>
            </div>

            <div className="flex flex-col justify-between p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/15 space-y-3">
              <div>
                <span className="flex items-center gap-1.5 font-extrabold text-cyan-300 text-sm">
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  {t.lobby.connectTable}
                </span>
                <p className="text-[11px] text-zinc-400 mt-1">{t.lobby.connectTableDesc}</p>
                <input
                  type="text"
                  value={targetCode}
                  onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                  placeholder={t.lobby.roomCodePlaceholder}
                  className="w-full mt-2 bg-black border border-zinc-700 px-3 py-1.5 rounded text-cyan-300 uppercase focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>
              <button
                type="button"
                disabled={!targetCode}
                onClick={() => void session.joinRoom(targetCode, nickname)}
                className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:pointer-events-none text-black font-extrabold rounded shadow-lg shadow-cyan-500/20 transition-all cursor-pointer text-xs"
              >
                [{t.lobby.connectTable} // CONNECT TO TABLE]
              </button>
            </div>
          </div>

          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="flex items-center gap-2 text-zinc-400 hover:text-emerald-300 text-xs transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>{t.lobby.howToPlayPrompt}</span>
            </button>
          </div>
        </div>

        <GameRulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
      </div>
    );
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
            <RoomCodeBadge roomCode={roomCode} />
            <ConnectionStatusPill />
            {roomState === 'GameOver' && isHost && (
              <button
                type="button"
                onClick={() => void session.startRound()}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs cursor-pointer"
              >
                [{t.table.playAgain}]
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="p-1 text-zinc-400 hover:text-emerald-300 cursor-pointer"
              title={t.common.gameRules}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => session.leaveRoom()}
              className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
              title="Leave Table"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
          <div className="flex flex-col items-center justify-center p-6 bg-black/90 border-2 border-emerald-500 rounded-xl text-center space-y-3 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-widest animate-pulse">
              🏆 {t.table.matchWon}: {winnerNickname.toUpperCase()}!
            </span>
            <p className="text-xs text-zinc-400">{t.table.matchOverDesc}</p>
            {isHost ? (
              <button
                type="button"
                onClick={() => void session.startRound()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/30"
              >
                [{t.table.playAgain}]
              </button>
            ) : (
              <span className="text-xs text-amber-400 italic">{t.lobby.waitingForPlayers}</span>
            )}
          </div>
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
            isDischargeCinematicActive={Boolean(dischargeCinematic)}
            onStartNextRound={() => void session.startRound()}
          />
        ) : null}
      </BunkerArenaCanvas>

      <GameRulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
    </div>
  );
};
