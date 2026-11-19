import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GameRulesModal } from './features/game/components/GameRulesModal';
import { OperatingTable } from './features/game/components/OperatingTable';
import { ToastHost } from './features/game/components/ToastHost';
import { useRoomUrlSync } from './features/game/hooks/useRoomUrlSync';
import { useRulesModalStore } from './features/game/stores/useRulesModalStore';

const queryClient = new QueryClient();

export function App() {
  const isRulesOpen = useRulesModalStore((s) => s.isOpen);
  const closeRules = useRulesModalStore((s) => s.close);
  useRoomUrlSync();

  return (
    <QueryClientProvider client={queryClient}>
      {/* The table (3D arena and 3D bunker lobby) manages its own fullscreen viewport. */}
      <div className="relative text-emerald-400 font-mono overflow-hidden w-screen h-[100dvh] bg-black">
        <ToastHost />
        <OperatingTable />

        {/* Single Rules Modal instance (opened from the lobby and from the table) */}
        <GameRulesModal isOpen={isRulesOpen} onClose={closeRules} />
      </div>
    </QueryClientProvider>
  );
}
export default App;
