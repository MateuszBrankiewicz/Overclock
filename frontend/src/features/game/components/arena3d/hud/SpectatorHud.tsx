import { ChevronLeft, ChevronRight, Eye, Layers } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { HudBadge, HudButton, HudPanel } from '../../../../../shared/ui';
import type { PlayerSeat } from '../../../schemas/gameEvents';
import type { ArenaCameraFocus } from '../../../stores/types';

export interface SpectatorHudProps {
  livingOpponents: PlayerSeat[];
  currentTargetId: string | null;
  cameraFocus: ArenaCameraFocus;
  onSelectTarget: (playerId: string | null) => void;
  onSelectFocus: (focus: ArenaCameraFocus) => void;
}

export const SpectatorHud: React.FC<SpectatorHudProps> = ({
  livingOpponents,
  currentTargetId,
  cameraFocus,
  onSelectTarget,
  onSelectFocus,
}) => {
  const { t } = useI18n();

  const currentIndex = livingOpponents.findIndex((o) => o.playerId === currentTargetId);
  const currentTarget = currentIndex >= 0 ? livingOpponents[currentIndex] : null;

  const handlePrev = () => {
    if (livingOpponents.length === 0) return;
    const prevIdx =
      currentIndex <= 0 ? livingOpponents.length - 1 : currentIndex - 1;
    const prev = livingOpponents[prevIdx];
    onSelectTarget(prev.playerId);
    onSelectFocus('opponents');
  };

  const handleNext = () => {
    if (livingOpponents.length === 0) return;
    const nextIdx =
      currentIndex < 0 || currentIndex >= livingOpponents.length - 1
        ? 0
        : currentIndex + 1;
    const next = livingOpponents[nextIdx];
    onSelectTarget(next.playerId);
    onSelectFocus('opponents');
  };

  const handleOverview = () => {
    onSelectTarget(null);
    onSelectFocus('overview');
  };

  return (
    <div
      data-testid="spectator-hud"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-max max-w-[calc(100vw-1.5rem)] pointer-events-auto"
    >
      <HudBadge variant="warning" size="md" className="tracking-widest">
        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{t.summary.spectatingBadge}</span>
      </HudBadge>

      <HudPanel
        tone="default"
        cornerBrackets={false}
        className="px-3 py-1.5 flex items-center gap-2 text-xs"
      >
        <HudButton
          size="sm"
          variant="ghost"
          aria-label={t.summary.spectatorCycle}
          onClick={handlePrev}
          disabled={livingOpponents.length <= 1}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </HudButton>

        <span className="font-bold text-zinc-200 min-w-20 sm:min-w-28 text-center truncate">
          {currentTarget ? currentTarget.nickname : t.summary.spectatorOverview}
        </span>

        <HudButton
          size="sm"
          variant="ghost"
          aria-label={t.summary.spectatorCycle}
          onClick={handleNext}
          disabled={livingOpponents.length <= 1}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </HudButton>

        <div className="h-4 w-px bg-zinc-700/60 mx-1" />

        <HudButton
          size="sm"
          variant={cameraFocus === 'overview' && !currentTargetId ? 'primary' : 'ghost'}
          onClick={handleOverview}
        >
          <Layers className="w-3 h-3 mr-1" />
          <span>{t.summary.spectatorOverview}</span>
        </HudButton>
      </HudPanel>
    </div>
  );
};
