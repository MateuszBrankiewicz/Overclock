import { LogOut } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { type LeaveConfirmAction, type LeaveConfirmState, reduceLeaveConfirm } from '../utils/leaveConfirm';

export interface LeaveTableButtonProps {
  onLeave: () => void;
  /** Test hook: render the confirmation step straight away. */
  initialState?: LeaveConfirmState;
}

export const LeaveTableButton: React.FC<LeaveTableButtonProps> = ({
  onLeave,
  initialState = 'idle',
}) => {
  const { t } = useI18n();
  const [state, setState] = useState<LeaveConfirmState>(initialState);

  const dispatch = (action: LeaveConfirmAction) => {
    const next = reduceLeaveConfirm(state, action);
    setState(next.state);
    if (next.shouldLeave) onLeave();
  };

  if (state === 'confirming') {
    return (
      <span className="flex items-center gap-1.5 text-xs" role="alertdialog" aria-label={t.home.leaveConfirm}>
        <span className="text-red-300 font-bold">{t.home.leaveConfirm}</span>
        <button
          type="button"
          onClick={() => dispatch('confirm')}
          className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-black font-bold rounded cursor-pointer"
        >
          {t.home.leaveYes}
        </button>
        <button
          type="button"
          onClick={() => dispatch('cancel')}
          className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold rounded cursor-pointer"
        >
          {t.home.leaveNo}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => dispatch('request')}
      className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
      title={t.home.leaveTable}
      aria-label={t.home.leaveTable}
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
};
