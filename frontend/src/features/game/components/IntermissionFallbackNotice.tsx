import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { IntermissionFallback } from '../utils/intermissionFallback';

export interface IntermissionFallbackNoticeProps {
  fallback: IntermissionFallback;
  onLeave?: () => void;
}

export const IntermissionFallbackNotice: React.FC<IntermissionFallbackNoticeProps> = ({
  fallback,
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
