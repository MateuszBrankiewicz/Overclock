import { Volume2, VolumeX } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import { useAudioSettings } from '../../../shared/lib/audio';

export interface AudioMuteButtonProps {
  muted?: boolean;
  onToggle?: () => void;
}

export const AudioMuteButton: React.FC<AudioMuteButtonProps> = ({
  muted: propMuted,
  onToggle: propOnToggle,
}) => {
  const storeMuted = useAudioSettings((s) => s.muted);
  const storeToggle = useAudioSettings((s) => s.toggleMute);
  const muted = propMuted !== undefined ? propMuted : storeMuted;
  const toggleMute = propOnToggle ?? storeToggle;
  const { t } = useI18n();
  const label = muted ? t.hud.unmuteAudio : t.hud.muteAudio;

  return (
    <button
      type="button"
      data-testid="audio-mute-button"
      onClick={toggleMute}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className="p-1 rounded text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
    >
      {muted ? (
        <VolumeX className="w-4 h-4 text-amber-400/80" />
      ) : (
        <Volume2 className="w-4 h-4 text-zinc-300" />
      )}
    </button>
  );
};
