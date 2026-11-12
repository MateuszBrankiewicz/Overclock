import { Sparkles } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import { type GfxQuality, useGfxSettings } from '../stores/useGfxSettings';

export interface GfxQualityButtonProps {
  quality?: GfxQuality;
  onToggle?: () => void;
}

export const GfxQualityButton: React.FC<GfxQualityButtonProps> = ({
  quality: propQuality,
  onToggle: propOnToggle,
}) => {
  const storeQuality = useGfxSettings((s) => s.quality);
  const storeToggle = useGfxSettings((s) => s.toggleQuality);
  const quality = propQuality !== undefined ? propQuality : storeQuality;
  const toggleQuality = propOnToggle ?? storeToggle;
  const { t } = useI18n();

  const isHigh = quality === 'high';
  const label = isHigh ? t.hud.gfxHigh : t.hud.gfxLow;

  return (
    <button
      type="button"
      data-testid="gfx-quality-button"
      onClick={toggleQuality}
      aria-pressed={isHigh}
      aria-label={`${label} — ${t.hud.gfxToggleTooltip}`}
      title={`${label} — ${t.hud.gfxToggleTooltip}`}
      className="p-1 rounded text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 flex items-center gap-1"
    >
      <Sparkles
        className={`w-4 h-4 ${
          isHigh ? 'text-emerald-400' : 'text-zinc-600 opacity-60'
        }`}
      />
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
        {isHigh ? 'FX' : 'NO-FX'}
      </span>
    </button>
  );
};
