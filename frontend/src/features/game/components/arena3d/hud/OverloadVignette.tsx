import React from 'react';

import { useI18n } from '../../../../../shared/i18n';

/** First-person POV local death glitch vignette. */
export const OverloadVignette: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300 bg-red-950/40 mix-blend-color-burn animate-pulse shadow-[inset_0_0_120px_rgba(239,68,68,0.9)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono">
        <span className="text-xl sm:text-2xl font-black text-red-500 tracking-widest block animate-pulse">
          {t.arena.overloadTitle}
        </span>
        <span className="text-xs text-zinc-400 tracking-wider">{t.arena.overloadSub}</span>
      </div>
    </div>
  );
};
