import clsx from 'clsx';
import { useState } from 'react';

import {
  DebugTerminal,
  GameRulesModal,
  OperatingTable,
  ToastHost,
  useRoomUrlSync,
  useUiStore,
} from '../features/game';
import { AppProviders } from './AppProviders';
import { TerminalChrome } from './TerminalChrome';

type AppView = 'table' | 'terminal';

export function App() {
  const [activeView, setActiveView] = useState<AppView>('table');
  const isRulesOpen = useUiStore((s) => s.isRulesOpen);
  const closeRules = useUiStore((s) => s.closeRules);
  useRoomUrlSync();

  // The table (3D arena and 3D bunker lobby) manages its own fullscreen viewport.
  // Traditional web chrome is only shown for the dev terminal view.
  const isTerminal = activeView === 'terminal';

  return (
    <AppProviders>
      <div
        className={clsx(
          'relative text-emerald-400 font-mono overflow-hidden',
          isTerminal ? 'min-h-screen bg-zinc-950 flex flex-col p-4 sm:p-6' : 'w-screen h-[100dvh] bg-black'
        )}
      >
        <ToastHost />

        {isTerminal ? (
          <TerminalChrome onBackToGame={() => setActiveView('table')}>
            <DebugTerminal />
          </TerminalChrome>
        ) : (
          <OperatingTable onOpenTerminal={() => setActiveView('terminal')} />
        )}

        {/* Single Rules Modal instance (opened from the lobby and from the table) */}
        <GameRulesModal isOpen={isRulesOpen} onClose={closeRules} />
      </div>
    </AppProviders>
  );
}

export default App;
