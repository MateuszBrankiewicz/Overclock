import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, Globe, HelpCircle, LayoutGrid, Terminal } from 'lucide-react';
import { useState } from 'react';

import { DebugTerminal } from './features/game/components/DebugTerminal';
import { GameRulesModal } from './features/game/components/GameRulesModal';
import { OperatingTable } from './features/game/components/OperatingTable';
import { useI18n } from './shared/i18n';

const queryClient = new QueryClient();

export function App() {
  const [activeView, setActiveView] = useState<'table' | 'terminal'>('table');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen bg-zinc-950 text-emerald-400 font-mono flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none z-50" />

        {/* Top Terminal Bar */}
        <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-wider text-emerald-300">
              {t.common.appTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* View switcher */}
            <div className="flex rounded border border-zinc-700 bg-black/60 p-0.5">
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  activeView === 'table'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t.common.operatingTable}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  activeView === 'terminal'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{t.common.debugTerminal}</span>
              </button>
            </div>

            {/* Game Rules Modal Button */}
            <button
              type="button"
              onClick={() => setIsRulesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-zinc-700 hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer"
              title={t.common.gameRules}
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.common.gameRules}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-black/70 border border-zinc-700 rounded p-0.5">
              <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
              <button
                type="button"
                onClick={() => setLanguage('pl')}
                className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors cursor-pointer ${
                  language === 'pl'
                    ? 'bg-emerald-500 text-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-emerald-500 text-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                EN
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-3 text-zinc-400">
              <span className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>{t.common.netOnline}</span>
              </span>
              <span className="border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400 text-[11px]">
                SYS.VER: 0.2.0
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
          {activeView === 'table' ? <OperatingTable /> : <DebugTerminal />}
        </main>

        {/* Rules Modal */}
        <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

        {/* Footer Bar */}
        <footer className="border-t border-zinc-800 pt-4 mt-6 text-xs text-zinc-500 flex flex-wrap justify-between gap-2">
          <span>DEAD CIRCUIT // OPERATIONAL INTERFACE</span>
          <span>STRICT VERIFICATION: NETARCHTEST + TESTCONTAINERS + ORVAL</span>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
