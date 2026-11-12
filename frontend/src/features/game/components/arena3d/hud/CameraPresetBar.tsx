import clsx from 'clsx';
import { Camera, Eye, Layers } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import type { ArenaCameraFocus } from '../../../stores/types';

export interface CameraPresetBarProps {
  cameraFocus: ArenaCameraFocus;
  onSelect: (focus: ArenaCameraFocus, yaw: number, pitch: number) => void;
  onDismissDischarge?: () => void;
  showDismiss: boolean;
}

const presetClass = (active: boolean) =>
  clsx(
    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
    active ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
  );

export const CameraPresetBar: React.FC<CameraPresetBarProps> = ({
  cameraFocus,
  onSelect,
  onDismissDischarge,
  showDismiss,
}) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md border border-zinc-800 p-1 rounded-xl pointer-events-auto">
      <button
        type="button"
        onClick={() => onSelect('overview', 0, 0)}
        className={presetClass(cameraFocus === 'overview')}
      >
        <Eye className="w-3 h-3" />
        <span>{t.hud.cameraPov}</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect('table', 0, -0.2)}
        className={presetClass(cameraFocus === 'table')}
      >
        <Layers className="w-3 h-3" />
        <span>{t.hud.cameraTable}</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect('opponents', 0, 0.2)}
        className={presetClass(cameraFocus === 'opponents')}
      >
        <Camera className="w-3 h-3" />
        <span>{t.hud.cameraRivals}</span>
      </button>
      {showDismiss && onDismissDischarge && (
        <button
          type="button"
          onClick={onDismissDischarge}
          className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          [{t.voltage.dismiss}]
        </button>
      )}
    </div>
  );
};
