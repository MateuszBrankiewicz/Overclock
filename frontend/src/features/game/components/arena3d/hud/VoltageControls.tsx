import { ShieldCheck, Zap } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { HudBadge, HudButton } from '../../../../../shared/ui';

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
      <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <HudBadge
          variant="warning"
          size="md"
          className="motion-safe:animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]"
        >
          <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            {pendingPlayerNickname
              ? `${t.voltage.pendingOpponentAlert} [${pendingPlayerNickname}]`
              : t.voltage.pendingOpponentAlert}
          </span>
        </HudBadge>
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-lg w-full px-4 pointer-events-none">
      <HudBadge
        variant="danger"
        size="md"
        className="motion-safe:animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.7)]"
      >
        <Zap className="w-3.5 h-3.5 shrink-0 text-red-400" />
        <span>{t.voltage.pendingSelfAlert}</span>
      </HudBadge>
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {canUseGroundWire && onDeployGroundWire && (
          <HudButton
            variant="primary"
            size="lg"
            onClick={onDeployGroundWire}
            className="shadow-[0_0_20px_rgba(16,185,129,0.6)]"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{t.voltage.useGroundWire}</span>
          </HudButton>
        )}
        {onTriggerDischarge && (
          <HudButton
            variant="warning"
            size="lg"
            onClick={onTriggerDischarge}
            className="shadow-[0_0_25px_rgba(245,158,11,0.8)]"
          >
            <Zap className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{t.voltage.triggerDischarge} (D6)</span>
          </HudButton>
        )}
      </div>
    </div>
  );
};
