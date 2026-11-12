import React from 'react';

import { useI18n } from '../../../../../shared/i18n';

export interface FirstTurnHintProps {
  visible: boolean;
  onDismiss: () => void;
}

/** Dismissable once-per-match tip shown above the action strip. */
export const FirstTurnHint: React.FC<FirstTurnHintProps> = ({ visible, onDismiss }) => {
  const { t } = useI18n();
  if (!visible) return null;
  return (
    <div
      data-testid="first-turn-hint"
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-400/80 text-emerald-100 text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)]"
    >
      <span>{t.controls.firstTurnHint}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="px-2 py-0.5 rounded border border-emerald-300 text-emerald-200 hover:bg-emerald-800"
      >
        {t.controls.firstTurnDismiss}
      </button>
    </div>
  );
};
