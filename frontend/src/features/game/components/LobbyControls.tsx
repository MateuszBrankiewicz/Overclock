interface LobbyControlsProps {
  nickname: string;
  setNickname: (v: string) => void;
  targetRoomCode: string;
  setTargetRoomCode: (v: string) => void;
  isReadyToggle: boolean;
  setIsReadyToggle: (v: boolean) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onSetReady: () => void;
  onStartRound: () => void;
  onSimulateDisconnect: () => void;
  onReconnect: () => void;
}

export function LobbyControls({
  nickname,
  setNickname,
  targetRoomCode,
  setTargetRoomCode,
  isReadyToggle,
  setIsReadyToggle,
  onCreateRoom,
  onJoinRoom,
  onSetReady,
  onStartRound,
  onSimulateDisconnect,
  onReconnect,
}: LobbyControlsProps) {
  return (
    <div className="space-y-3 bg-zinc-900/60 p-3 rounded border border-zinc-800/80">
      <div className="text-zinc-300 font-bold border-b border-zinc-800 pb-1">1. LOBBY & NETWORK</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="nick-input" className="block text-zinc-500 text-[10px]">NICKNAME</label>
          <input
            id="nick-input"
            className="w-full bg-black border border-zinc-700 px-2 py-1 rounded text-emerald-300"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="room-input" className="block text-zinc-500 text-[10px]">ROOM CODE</label>
          <input
            id="room-input"
            className="w-full bg-black border border-zinc-700 px-2 py-1 rounded text-emerald-300 uppercase"
            value={targetRoomCode}
            placeholder="CYBER-..."
            onChange={(e) => setTargetRoomCode(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded"
          onClick={onCreateRoom}
        >[Create Room]</button>
        <button
          type="button"
          className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
          onClick={onJoinRoom}
        >[Join]</button>
        <button
          type="button"
          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
          onClick={() => { onSetReady(); setIsReadyToggle(!isReadyToggle); }}
        >[Ready: {isReadyToggle ? 'TRUE' : 'FALSE'}]</button>
        <button
          type="button"
          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded"
          onClick={onStartRound}
        >[Start Round]</button>
        <button
          type="button"
          className="px-2 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
          onClick={onSimulateDisconnect}
        >[Simulate Disconnect]</button>
        <button
          type="button"
          className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded"
          onClick={onReconnect}
        >[Reconnect]</button>
      </div>
    </div>
  );
}

