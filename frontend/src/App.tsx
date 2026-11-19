import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import clsx from 'clsx';
import { Globe, HelpCircle, Terminal } from 'lucide-react';
import { useState } from 'react';

import { DebugTerminal } from './features/game/components/DebugTerminal';
import { GameRulesModal } from './features/game/components/GameRulesModal';
import { OperatingTable } from './features/game/components/OperatingTable';
import { ToastHost } from './features/game/components/ToastHost';
import { useRoomUrlSync } from './features/game/hooks/useRoomUrlSync';
import { useUiStore } from './features/game/stores/useUiStore';
import { useI18n } from './shared/i18n';

const queryClient = new QueryClient();

export function App() {
  const [activeView, setActiveView] = useState<'table' | 'terminal'>('table');
  const { language, setLanguage, t } = useI18n();
  const isRulesOpen = useUiStore((s) => s.isRulesOpen);
  const openRules = useUiStore((s) => s.openRules);
  const closeRules = useUiStore((s) => s.closeRules);
  useRoomUrlSync();

  // The table (3D arena and 3D bunker lobby) manages its own fullscreen viewport.
  // Traditional web chrome is only shown for the dev terminal view.
  const showWebChrome = activeView === 'terminal';

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
      <div
        className={clsx(
          'relative text-emerald-400 font-mono overflow-hidden',
          showWebChrome
            ? 'min-h-screen bg-zinc-950 flex flex-col p-4 sm:p-6'
            : 'w-screen h-[100dvh] bg-black'
        )}
      >
        <ToastHost />
        {/* CRT Scanline overlay for dev terminal */}
        {showWebChrome && <div className="absolute inset-0 scanlines pointer-events-none z-50" />}

        {showWebChrome && (
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

              <button
                type="button"
                onClick={() => setActiveView('table')}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <Terminal className="w-3 h-3" />
                <span>{t.home.backToGame}</span>
              </button>
            </div>
          </header>
        )}

        {showWebChrome ? (
          <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
            <DebugTerminal />
          </main>
        ) : (
          <OperatingTable onOpenTerminal={() => setActiveView('terminal')} />
        )}

        {/* Single Rules Modal instance (opened from the lobby and from the table) */}
        <GameRulesModal isOpen={isRulesOpen} onClose={closeRules} />

        {showWebChrome && (
          <footer className="border-t border-zinc-800 pt-4 mt-6 text-xs text-zinc-500">
            <span>{t.home.footer}</span>
          </footer>
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
