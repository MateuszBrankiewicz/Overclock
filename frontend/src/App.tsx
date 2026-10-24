import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, Terminal } from 'lucide-react';

import { DebugTerminal } from './features/game/components/DebugTerminal';

const queryClient = new QueryClient();

export function App() {
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
        <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
          <DebugTerminal />
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
