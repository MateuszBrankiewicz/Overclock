import React from 'react';

import { useI18n } from '../../../../../shared/i18n';

export interface VoltageControlsProps {
  isLocalPlayerPending: boolean;
  pendingPlayerNickname: string | null;
  canUseGroundWire: boolean;
  onDeployGroundWire?: () => void;
  onTriggerDischarge?: () => void;
}

/** In-arena tactile voltage controls (no blocking modal popups). */
export const VoltageControls: React.FC<VoltageControlsProps> = ({
  isLocalPlayerPending,
  pendingPlayerNickname,
  canUseGroundWire,
  onDeployGroundWire,
  onTriggerDischarge,
}) => {
  const { t } = useI18n();

  if (!isLocalPlayerPending) {
    return (
      <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-bold tracking-wider animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)] text-center pointer-events-none">
        {pendingPlayerNickname
          ? `${t.voltage.pendingOpponentAlert} [${pendingPlayerNickname}]`
          : t.voltage.pendingOpponentAlert}
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-lg w-full px-4 pointer-events-none">
      <div className="px-4 py-1.5 rounded-full bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-bold tracking-wider animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.7)] text-center">
        {t.voltage.pendingSelfAlert}
      </div>
      <div className="flex items-center gap-2 pointer-events-auto">
        {canUseGroundWire && onDeployGroundWire && (
          <button
            type="button"
            onClick={onDeployGroundWire}
            className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            ⚡ {t.voltage.useGroundWire}
          </button>
        )}
        {onTriggerDischarge && (
          <button
            type="button"
            onClick={onTriggerDischarge}
            className="px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.8)] active:scale-95 transition-all cursor-pointer"
          >
            ⚡ {t.voltage.triggerDischarge} (D6)
          </button>
        )}
      </div>
    </div>
  );
};
