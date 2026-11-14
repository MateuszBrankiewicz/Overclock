import { useState } from 'react';

import { useDebugTerminal } from '../hooks/useDebugTerminal';
import type { CardProtocol } from '../schemas/gameEvents';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { LobbyControls } from './LobbyControls';
import { StateJsonMirror } from './StateJsonMirror';
import { TraceResolutionBanner } from './TraceResolutionBanner';

const PROTOCOLS: CardProtocol[] = ['Alpha', 'Beta', 'Gamma', 'Glitch', 'Corrupted'];

export function DebugTerminal() {
  const [nickname, setNickname] = useState(() => 'Player_' + Math.floor(Math.random() * 900 + 100));
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [isReadyToggle, setIsReadyToggle] = useState(true);

  const roomCode = useGameStore((state) => state.roomCode);
  const roomState = useGameStore((state) => state.roomState);
  const playerId = useGameStore((state) => state.playerId);
  const activePlayerId = useGameStore((state) => state.activePlayerId);
  const currentTargetProtocol = useGameStore((state) => state.currentTargetProtocol);
  const myCards = useGameStore((state) => state.myCards);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const toggleCardSelection = useGameStore((state) => state.toggleCardSelection);
  const holdToRevealCards = useUiStore((state) => state.holdToRevealCards);
  const isHandRevealed = useUiStore((state) => state.isHandRevealed);
  const isConcealed = holdToRevealCards && !isHandRevealed;

  const terminal = useDebugTerminal();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 font-mono text-xs text-emerald-400 p-4 bg-zinc-950 border border-zinc-800 rounded shadow-2xl">
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
          <span className="font-bold tracking-wider text-emerald-300">HEADLESS DEBUG TERMINAL</span>
        </div>
        <div className="flex items-center space-x-3 text-zinc-400">
          <span>NET: <span className={terminal.connectionStatus === 'Connected' ? 'text-emerald-400' : 'text-amber-400'}>{terminal.connectionStatus}</span></span>
          <span>ROOM: <span className="text-zinc-200">{roomCode ?? 'NONE'}</span></span>
          <span>STATE: <span className="text-amber-300">{roomState ?? 'STANDBY'}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LobbyControls
          nickname={nickname}
          setNickname={setNickname}
          targetRoomCode={targetRoomCode}
          setTargetRoomCode={setTargetRoomCode}
          isReadyToggle={isReadyToggle}
          setIsReadyToggle={setIsReadyToggle}
          onCreateRoom={() => void terminal.createRoom(nickname, targetRoomCode || undefined)}
          onJoinRoom={() => void terminal.joinRoom(targetRoomCode, nickname)}
          onSetReady={() => void terminal.setReady(isReadyToggle)}
          onStartRound={() => void terminal.startRound()}
          onSimulateDisconnect={() => void terminal.simulateDisconnect()}
          onReconnect={() => void terminal.reconnect()}
        />

        {/* Turn & Bluff Actions */}
        <div className="space-y-2.5 bg-zinc-900/60 p-3 rounded border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
            <span className="text-zinc-300 font-bold">2. TURN ACTIONS & TRACE</span>
            <span className={activePlayerId && activePlayerId === playerId ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
              {activePlayerId && activePlayerId === playerId ? '● YOUR MOVE' : '○ OPPONENT MOVE'}
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/60 px-2 py-1 rounded border border-zinc-800">
            <span className="text-zinc-400 text-[10px]">ROUND TARGET PROTOCOL:</span>
            <span className="text-amber-400 font-bold px-2 py-0.5 bg-amber-950/60 rounded border border-amber-800">
              {currentTargetProtocol ?? 'STANDBY'}
            </span>
          </div>

          <div>
            <div className="text-zinc-500 text-[10px] mb-1">
              SELECT 1-3 CARDS (CLAIMED AS {currentTargetProtocol ?? 'TARGET'}):
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[34px]">
              {myCards.length === 0 ? (
                <span className="text-zinc-600 italic">No cards in hand</span>
              ) : (
                myCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`px-2 py-1 rounded border text-[11px] ${
                      selectedCardIds.includes(card.id)
                        ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                    }`}
                    onClick={() => toggleCardSelection(card.id)}
                  >
                    {isConcealed ? 'HIDDEN [****]' : `${card.protocol} [${card.id.slice(0, 4)}]`}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px]">DECLARE:</span>
            <select
              aria-label="Target Protocol"
              className="bg-black border border-zinc-700 px-2 py-1 rounded text-emerald-300"
              value={terminal.selectedProtocol}
              onChange={(e) => terminal.setSelectedProtocol(e.target.value as CardProtocol)}
            >
              {PROTOCOLS.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <button
              type="button"
              disabled={selectedCardIds.length === 0}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-black font-bold rounded"
              onClick={() => void terminal.playCards()}
            >[Play Cards]</button>
            <button
              type="button"
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-black font-bold rounded"
              onClick={() => void terminal.callTrace()}
            >[Call TRACE]</button>
          </div>
          <div className="text-[11px] text-zinc-400 pt-1">
            LOG: <span className="text-zinc-200">{terminal.lastLog}</span>
          </div>
        </div>
      </div>

      {/* Trace Resolution & Round Status Banner */}
      <TraceResolutionBanner />

      {/* Live JSON State Monitor */}
      <StateJsonMirror />
    </div>
  );
}
