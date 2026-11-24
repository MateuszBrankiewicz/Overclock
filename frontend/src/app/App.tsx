import {
  GameRulesModal,
  OperatingTable,
  ToastHost,
  useRoomUrlSync,
  useUiStore,
} from '../features/game';
import { AppProviders } from './AppProviders';

export function App() {
  const isRulesOpen = useUiStore((s) => s.isRulesOpen);
  const closeRules = useUiStore((s) => s.closeRules);
  useRoomUrlSync();

  return (
    <AppProviders>
      {/* The table (3D arena and 3D bunker lobby) manages its own fullscreen viewport. */}
      <div className="relative text-emerald-400 font-mono overflow-hidden w-screen h-[100dvh] bg-black">
        <ToastHost />
        <OperatingTable />

        {/* Single Rules Modal instance (opened from the lobby and from the table) */}
        <GameRulesModal isOpen={isRulesOpen} onClose={closeRules} />
      </div>
    </AppProviders>
  );
}

export default App;
