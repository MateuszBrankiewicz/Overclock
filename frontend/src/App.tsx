import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Globe, HelpCircle, Terminal } from 'lucide-react';
import { useState } from 'react';

import { DebugTerminal } from './features/game/components/DebugTerminal';
import { GameRulesModal } from './features/game/components/GameRulesModal';
import { OperatingTable } from './features/game/components/OperatingTable';
import { ToastHost } from './features/game/components/ToastHost';
import { useRoomUrlSync } from './features/game/hooks/useRoomUrlSync';
import { useGameStore } from './features/game/stores/useGameStore';
import { useRulesModalStore } from './features/game/stores/useRulesModalStore';
import { useI18n } from './shared/i18n';

const queryClient = new QueryClient();

export function App() {
  const [activeView, setActiveView] = useState<'table' | 'terminal'>('table');
  const { language, setLanguage, t } = useI18n();
  const roomCode = useGameStore((s) => s.roomCode);
  const isRulesOpen = useRulesModalStore((s) => s.isOpen);
  const openRules = useRulesModalStore((s) => s.open);
  const closeRules = useRulesModalStore((s) => s.close);
  useRoomUrlSync();

  // The seated table is a fullscreen 3D scene: chrome would only render underneath it.
  const showChrome = !(roomCode && activeView === 'table');

  const langButton = (lang: 'pl' | 'en') => (
    <button
      key={lang}
      type="button"
      onClick={() => setLanguage(lang)}
      className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors cursor-pointer ${
        language === lang ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {lang.toUpperCase()}
    </button>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen bg-zinc-950 text-emerald-400 font-mono flex flex-col p-4 sm:p-6 overflow-hidden">
        <ToastHost />
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none z-50" />

        {showChrome && (
          <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-xl font-bold tracking-wider text-emerald-300">
              {t.common.appTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <button
                type="button"
                onClick={openRules}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-zinc-700 hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer"
                title={t.common.gameRules}
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.common.gameRules}</span>
              </button>

              <div className="flex items-center bg-black/70 border border-zinc-700 rounded p-0.5">
                <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
                {langButton('pl')}
                {langButton('en')}
              </div>

              {/* Dev tool: reachable but de-emphasised */}
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'table' ? 'terminal' : 'table')}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <Terminal className="w-3 h-3" />
                <span>{activeView === 'table' ? t.home.debugToggle : t.home.backToGame}</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
          {activeView === 'table' ? <OperatingTable /> : <DebugTerminal />}
        </main>

        {/* Single Rules Modal instance (opened from the lobby and from the table) */}
        <GameRulesModal isOpen={isRulesOpen} onClose={closeRules} />

        {showChrome && (
          <footer className="border-t border-zinc-800 pt-4 mt-6 text-xs text-zinc-500">
            <span>{t.home.footer}</span>
          </footer>
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
