import { Camera, Eye, Layers } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { HudButton, HudPanel } from '../../../../../shared/ui';
import type { ArenaCameraFocus } from '../../../stores/types';

export interface CameraPresetBarProps {
  cameraFocus: ArenaCameraFocus;
  onSelect: (focus: ArenaCameraFocus, yaw: number, pitch: number) => void;
  onDismissDischarge?: () => void;
  showDismiss: boolean;
}

export const CameraPresetBar: React.FC<CameraPresetBarProps> = ({
  cameraFocus,
  onSelect,
  onDismissDischarge,
  showDismiss,
}) => {
  const { t } = useI18n();

  return (
    <HudPanel
      tone="default"
      cornerBrackets={false}
      className="flex items-center gap-1 p-1 pointer-events-auto"
    >
      <HudButton
        size="sm"
        variant={cameraFocus === 'overview' ? 'primary' : 'ghost'}
        onClick={() => onSelect('overview', 0, 0)}
      >
        <Eye className="w-3 h-3 shrink-0" />
        <span>{t.hud.cameraPov}</span>
      </HudButton>
      <HudButton
        size="sm"
        variant={cameraFocus === 'table' ? 'primary' : 'ghost'}
        onClick={() => onSelect('table', 0, -0.2)}
      >
        <Layers className="w-3 h-3 shrink-0" />
        <span>{t.hud.cameraTable}</span>
      </HudButton>
      <HudButton
        size="sm"
        variant={cameraFocus === 'opponents' ? 'primary' : 'ghost'}
        onClick={() => onSelect('opponents', 0, 0.2)}
      >
        <Camera className="w-3 h-3 shrink-0" />
        <span>{t.hud.cameraRivals}</span>
      </HudButton>
      {showDismiss && onDismissDischarge && (
        <HudButton
          size="sm"
          variant="warning"
          onClick={onDismissDischarge}
        >
          <span>[{t.voltage.dismiss}]</span>
        </HudButton>
      )}
    </HudPanel>
  );
};
