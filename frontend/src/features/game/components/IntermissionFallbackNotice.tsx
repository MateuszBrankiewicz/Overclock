import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { IntermissionFallback } from '../utils/intermissionFallback';

export interface IntermissionFallbackNoticeProps {
  fallback: IntermissionFallback;
  onStartNextRound: () => void;
  onLeave?: () => void;
}

export const IntermissionFallbackNotice: React.FC<IntermissionFallbackNoticeProps> = ({
  fallback,
  onStartNextRound,
  onLeave,
}) => {
  const { t } = useI18n();
  if (fallback === 'none') return null;

  if (fallback === 'waitingForHost') {
    return (
      <span className="text-xs text-amber-300 italic animate-pulse">{t.home.waitingForHost}</span>
    );
  }

  return (
    <>
      <span className="text-xs text-red-300 font-bold">{t.home.hostGone}</span>
      {fallback === 'promoted' && (
        <button
          type="button"
          onClick={onStartNextRound}
          className="mt-1 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer shadow-md transition-all active:scale-95"
        >
          [{t.intermission.fallbackStart}]
        </button>
      )}
      {onLeave && (
        <button
          type="button"
          onClick={onLeave}
          className="text-xs text-zinc-400 hover:text-red-400 cursor-pointer"
        >
          {t.home.leaveTable}
        </button>
      )}
    </>
  );
};
