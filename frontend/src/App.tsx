import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity,Shield, Terminal, Zap } from 'lucide-react';

import { useGameStore } from './features/game/stores/useGameStore';

const queryClient = new QueryClient();

export function App() {
  const isInRoom = useGameStore((state) => state.isInRoom);
  const roomCode = useGameStore((state) => state.roomCode);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen bg-zinc-950 text-emerald-400 font-mono flex flex-col p-6 overflow-hidden">
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none z-50" />

        {/* Top Terminal Bar */}
        <header className="border-b border-zinc-800 pb-4 mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-wider text-emerald-300">
              PROJECT: OVERCLOCK // DEAD CIRCUIT
            </h1>
          </div>
          <div className="flex items-center space-x-4 text-xs text-zinc-400">
            <span className="flex items-center space-x-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>NET: ONLINE</span>
            </span>
            <span className="border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400">
              SYS.VER: 0.1.0-ALPHA
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full">
          <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-8 shadow-2xl backdrop-blur">
            <div className="border-b border-zinc-800/80 pb-4 mb-6 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-amber-400">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-bold tracking-wide">SYSTEM READY FOR PROTOCOL HANDSHAKE</span>
              </div>
              <span className="text-xs text-zinc-500">PORT: 5000</span>
            </div>

            <div className="space-y-4 text-sm text-zinc-300">
              <p>
                Authoritative real-time game engine with single-writer room loop and runtime
                validated contracts.
              </p>

              <div className="bg-black/50 border border-zinc-800 p-4 rounded text-xs space-y-2">
                <div className="text-zinc-400 flex justify-between">
                  <span>ROOM STATUS:</span>
                  <span className={isInRoom ? 'text-emerald-400' : 'text-zinc-500'}>
                    {isInRoom ? `CONNECTED [${roomCode}]` : 'STANDBY'}
                  </span>
                </div>
                <div className="text-zinc-400 flex justify-between">
                  <span>VOLTAGE BUS:</span>
                  <span className="text-amber-400">0V / NOMINAL</span>
                </div>
                <div className="text-zinc-400 flex justify-between">
                  <span>RUNTIME VALIDATION:</span>
                  <span className="text-emerald-400">ZOD ACTIVE</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400 transition-colors flex items-center space-x-2 text-xs"
                >
                  <Shield className="w-4 h-4" />
                  <span>INITIALIZE COMBAT NODE</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer Bar */}
        <footer className="border-t border-zinc-800 pt-4 mt-6 text-xs text-zinc-500 flex justify-between">
          <span>DEAD CIRCUIT ARCHITECTURE HARNESS</span>
          <span>STRICT VERIFICATION: NETARCHTEST + TESTCONTAINERS + ORVAL</span>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
