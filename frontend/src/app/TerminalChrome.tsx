import { HelpCircle, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';

import { useUiStore } from '../features/game';
import { useI18n } from '../shared/i18n';
import { LanguageSwitch } from './LanguageSwitch';

interface TerminalChromeProps {
  onBackToGame: () => void;
  children: ReactNode;
}

/** Classic web chrome (header, footer, scanlines) around the developer terminal view. */
export function TerminalChrome({ onBackToGame, children }: TerminalChromeProps) {
  const t = useI18n((s) => s.t);
  const openRules = useUiStore((s) => s.openRules);

  return (
    <>
      {/* CRT Scanline overlay for dev terminal */}
      <div className="absolute inset-0 scanlines pointer-events-none z-50" />

      <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-xl font-bold tracking-wider text-emerald-300">{t.common.appTitle}</h1>

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

          <LanguageSwitch />

          <button
            type="button"
            onClick={onBackToGame}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
            <span>{t.home.backToGame}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-start items-center max-w-5xl mx-auto w-full space-y-6">
        {children}
      </main>

      <footer className="border-t border-zinc-800 pt-4 mt-6 text-xs text-zinc-500">
        <span>{t.home.footer}</span>
      </footer>
    </>
  );
}
