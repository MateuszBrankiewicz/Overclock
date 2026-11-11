import clsx from 'clsx';
import React, { useState } from 'react';

import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { CapacitorMeter } from './CapacitorMeter';
import { CardRevealSequence } from './CardRevealSequence';
import { ExploitChipSlot } from './ExploitChipSlot';
import { OpponentSeats } from './OpponentSeats';
import { PcbCard } from './PcbCard';
import { TablePile } from './TablePile';
import { VoltageTestSequence } from './VoltageTestSequence';

export const OperatingTable: React.FC = () => {
  const session = useGameSession();
  const [nickname, setNickname] = useState(() => 'Player_' + Math.floor(Math.random() * 900 + 100));
  const [targetCode, setTargetCode] = useState('');
  const [isReadyToggle, setIsReadyToggle] = useState(true);

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
  const lastTraceResolution = useGameStore((s) => s.lastTraceResolution);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const dischargeDeadlineUtc = useGameStore((s) => s.dischargeDeadlineUtc);
  const canActivateExploit = useGameStore((s) => s.canActivateExploit);
  const lastDischargeOutcome = useGameStore((s) => s.lastDischargeOutcome);
  const sniffedCard = useGameStore((s) => s.sniffedCard);

  const [dismissedDischarge, setDismissedDischarge] = useState<unknown>(null);
  const activeDischargeOutcome =
    lastDischargeOutcome && lastDischargeOutcome !== dismissedDischarge
      ? lastDischargeOutcome
      : null;

  const me = players.find((p) => p.playerId === playerId);
  const pendingPlayer = players.find((p) => p.playerId === pendingDischargePlayerId);
  const isLocalPlayerPending = Boolean(playerId && pendingDischargePlayerId === playerId);
  const canUseGroundWire = Boolean(
    isLocalPlayerPending &&
    me?.exploit?.type === 'GroundWire' &&
    !me.exploit.isBurned
  );
  const isEliminated = me?.status === 'Eliminated';

  const isMyTurn = Boolean(activePlayerId && playerId && activePlayerId === playerId && !isEliminated);
  const isHost = Boolean(hostId && playerId && hostId === playerId);

  const accuserNickname = players.find((p) => p.playerId === lastTraceResolution?.accuserPlayerId)?.nickname ?? 'Player';
  const accusedNickname = players.find((p) => p.playerId === lastTraceResolution?.accusedPlayerId)?.nickname ?? 'Opponent';
  const winnerNickname = players.find((p) => p.playerId === winnerId)?.nickname ?? (winnerId === playerId ? 'YOU' : 'Operator');

  if (!roomCode) {
    return (
      <div className="w-full max-w-2xl mx-auto font-mono text-emerald-400 bg-zinc-950/95 border border-zinc-800 rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5">
        <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
          <span className="font-extrabold tracking-widest text-emerald-300 text-sm">
            HARDWARE TERMINAL // DECK SETUP
          </span>
          <span className="text-xs text-zinc-500">NET: {session.connectionStatus}</span>
        </div>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1.5 font-bold">OPERATOR IDENTIFIER (NICKNAME):</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-black/90 border border-zinc-700 px-3.5 py-2 rounded text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1.5 font-bold">ROOM CODE (EMPTY TO CREATE NEW LOBBY):</label>
            <input
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
              placeholder="E.G. CYBER-7X9"
              className="w-full bg-black/90 border border-zinc-700 px-3.5 py-2 rounded text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => void session.createRoom(nickname, targetCode || undefined)}
              className="flex-1 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              [INITIALIZE TABLE]
            </button>
            <button
              type="button"
              disabled={!targetCode}
              onClick={() => void session.joinRoom(targetCode, nickname)}
              className="flex-1 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-black font-extrabold rounded shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              [CONNECT TO TABLE]
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 font-mono select-none" style={{ perspective: '1400px' }}>
      {/* Top Table Control Bar */}
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between text-xs gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          <span className="font-extrabold text-zinc-100 tracking-wider">ROOM: {roomCode}</span>
          <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-bold">
            [{roomState}]
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {roomState === 'Lobby' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = !isReadyToggle;
                  setIsReadyToggle(next);
                  void session.setReady(next);
                }}
                className={clsx(
                  'px-3.5 py-1.5 rounded font-extrabold text-black text-xs transition-colors cursor-pointer',
                  isReadyToggle ? 'bg-emerald-500' : 'bg-zinc-600'
                )}
              >
                {isReadyToggle ? '[READY: YES]' : '[READY: NO]'}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={() => void session.startRound()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                >
                  [START MATCH]
                </button>
              )}
            </>
          )}

          {/* Controls for RoundOver or GameOver states */}
          {(roomState === 'RoundOver' || roomState === 'GameOver') && isHost && (
            <button
              type="button"
              onClick={() => void session.startRound()}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs shadow-lg shadow-emerald-500/40 animate-bounce cursor-pointer"
            >
              {roomState === 'GameOver' ? '[PLAY AGAIN // REMATCH]' : '[START NEXT ROUND]'}
            </button>
          )}

          <span className="text-zinc-400 text-[11px] ml-2">NET: {session.connectionStatus}</span>
        </div>
      </div>

      {/* High-Voltage Test & Dielectric Discharge Modal */}
      {(roomState === 'VoltageTest' || activeDischargeOutcome) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <VoltageTestSequence
            isVoltageTestActive={roomState === 'VoltageTest'}
            pendingPlayerId={pendingDischargePlayerId}
            pendingPlayerNickname={pendingPlayer?.nickname ?? 'Operator'}
            isLocalPlayerPending={isLocalPlayerPending}
            deadlineUtc={dischargeDeadlineUtc}
            lastDischargeOutcome={activeDischargeOutcome}
            canUseGroundWire={canUseGroundWire}
            onDeployGroundWire={() => void session.activateExploit('GroundWire')}
            onTriggerDischarge={() => void session.triggerDischarge()}
            onDismiss={() => setDismissedDischarge(lastDischargeOutcome)}
          />
        </div>
      )}

      {/* Opponents Isometric Stage */}
      <OpponentSeats seats={players} myPlayerId={playerId} activePlayerId={activePlayerId} />

      {/* 3D Operating Table Surface */}
      <div className="relative rounded-2xl border border-emerald-950/80 bg-zinc-950/80 p-6 min-h-[300px] flex items-center justify-center table-grid table-surface-3d">
        {roomState === 'GameOver' ? (
          <div className="flex flex-col items-center justify-center p-6 bg-black/90 border-2 border-emerald-500 rounded-xl text-center space-y-3 shadow-[0_0_50px_rgba(16,185,129,0.5)] z-20">
            <span className="text-2xl font-black text-emerald-400 tracking-widest animate-pulse">
              🏆 MATCH FINISHED: {winnerNickname.toUpperCase()} SURVIVED!
            </span>
            <p className="text-xs text-zinc-400">All other operators suffered catastrophic capacitor failure / short-circuit.</p>
            {isHost ? (
              <button
                type="button"
                onClick={() => void session.startRound()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/30"
              >
                [INITIATE REMATCH // PLAY AGAIN]
              </button>
            ) : (
              <span className="text-xs text-amber-400 italic">AWAITING HOST TO INITIATE REMATCH...</span>
            )}
          </div>
        ) : roomState === 'BluffCheck' || lastTraceResolution ? (
          <div className="w-full z-20">
            <CardRevealSequence
              revealedCards={lastTraceResolution?.revealedCards ?? []}
              declaredProtocol={lastTraceResolution?.declaredProtocol ?? (currentTargetProtocol ?? 'Alpha')}
              bluffDetected={lastTraceResolution?.bluffDetected ?? false}
              accuserNickname={accuserNickname}
              accusedNickname={accusedNickname}
            />
          </div>
        ) : (
          <TablePile cardCount={tablePileCount} />
        )}
      </div>

      {/* Player Hand & Transmission Dock */}
      <div className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-2 border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xl">
        {/* Elimination Alert if Player Short-Circuited */}
        {isEliminated && (
          <div className="p-3 bg-red-950/80 border-2 border-red-500 rounded-lg text-center font-bold text-xs text-red-300 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            ⚡ DIELECTRIC BREAKDOWN: OPERATOR SHORT-CIRCUITED &amp; ELIMINATED (SPECTATOR MODE)
          </div>
        )}

        {/* Packet Sniffer Confidential Intelligence */}
        {sniffedCard && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-950/60 border border-cyan-400/80 shadow-[0_0_15px_rgba(0,229,255,0.3)] text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span className="font-extrabold text-cyan-300">INTERCEPTED PACKET:</span>
              <span className="font-mono text-zinc-300">PROTOCOL:</span>
              <span className="px-2 py-0.5 rounded font-black text-black bg-cyan-400">
                {sniffedCard.protocol}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest hidden sm:inline">
              [CONFIDENTIAL // LOCAL OPERATOR ONLY]
            </span>
          </div>
        )}

        {/* Local Hardware Telemetry: Capacitor Meter & Exploit Chip Socket */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-zinc-950/90 rounded-lg border border-zinc-800 items-center">
          <CapacitorMeter
            riskLevel={me?.riskLevel ?? 1}
            isPendingDischarge={isLocalPlayerPending}
            size="md"
          />
          <div className="flex items-center justify-end">
            <ExploitChipSlot
              exploit={me?.exploit}
              canActivate={canActivateExploit && Boolean(me?.exploit && !me.exploit.isBurned)}
              onActivate={(exploit) => void session.activateExploit(exploit)}
              size="sm"
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800">
          <span className="font-extrabold text-zinc-200 tracking-wider">
            OPERATOR HAND // {myCards.length} PACKETS AVAILABLE
          </span>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">
              TARGET PROTOCOL:{' '}
              <strong className="text-amber-400 font-extrabold px-2.5 py-1 bg-amber-950/80 rounded border border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                {currentTargetProtocol ?? 'STANDBY'}
              </strong>
            </span>
            <span
              className={clsx(
                'font-extrabold px-2 py-0.5 rounded',
                isMyTurn
                  ? 'text-emerald-300 bg-emerald-950 border border-emerald-500 animate-pulse'
                  : 'text-zinc-500 bg-zinc-900 border border-zinc-800'
              )}
            >
              {isMyTurn ? '● YOUR TURN' : '○ OPPONENT TURN'}
            </span>
          </div>
        </div>

        {/* Card Buffer Dock with 3D Float Elevation */}
        <div className="flex flex-wrap gap-4 justify-center py-4 min-h-[170px]" style={{ perspective: '1000px' }}>
          {myCards.length === 0 ? (
            <div className="flex items-center justify-center text-zinc-600 text-xs italic">
              NO HARDWARE PACKETS IN LOCAL BUFFER
            </div>
          ) : (
            myCards.map((card) => (
              <PcbCard
                key={card.id}
                id={card.id}
                protocol={card.protocol}
                visualSeed={card.visualSeed}
                selected={selectedCardIds.includes(card.id)}
                onClick={() => toggleCardSelection(card.id)}
                size="md"
              />
            ))
          )}
        </div>

        {/* Action Controls & Target Protocol Reminder */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span>TRANSMITTING AS:</span>
            <span className="text-emerald-400 font-extrabold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {currentTargetProtocol ?? 'ALPHA'}
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">(All played cards are claimed as target)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selectedCardIds.length === 0 || !isMyTurn || isEliminated}
              onClick={() => void session.playCards()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-black font-extrabold rounded text-xs transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              [TRANSMIT {selectedCardIds.length > 0 ? `(${selectedCardIds.length} PACKETS)` : ''}]
            </button>
            <button
              type="button"
              disabled={!isMyTurn || tablePileCount === 0 || isEliminated}
              onClick={() => void session.callTrace()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none text-black font-extrabold rounded text-xs transition-all shadow-lg shadow-red-600/30 cursor-pointer"
            >
              [CALL TRACE]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
