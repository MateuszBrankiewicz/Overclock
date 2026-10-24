import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, LayoutGrid, Terminal } from 'lucide-react';
import { useState } from 'react';

import { DebugTerminal } from './features/game/components/DebugTerminal';
import { OperatingTable } from './features/game/components/OperatingTable';

const queryClient = new QueryClient();

export function App() {
  const [activeView, setActiveView] = useState<'table' | 'terminal'>('table');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen bg-zinc-950 text-emerald-400 font-mono flex flex-col p-6 overflow-hidden">
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none z-50" />

        {/* Top Terminal Bar */}
        <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-wider text-emerald-300">
              PROJECT: OVERCLOCK // DEAD CIRCUIT
            </h1>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex rounded border border-zinc-700 bg-black/60 p-0.5">
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                  activeView === 'table'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>OPERATING TABLE</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                  activeView === 'terminal'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>DEBUG TERMINAL</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center space-x-4 text-zinc-400">
              <span className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>NET: ONLINE</span>
              </span>
              <span className="border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400">
                SYS.VER: 0.2.0-PHASE1
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
          {activeView === 'table' ? <OperatingTable /> : <DebugTerminal />}
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
