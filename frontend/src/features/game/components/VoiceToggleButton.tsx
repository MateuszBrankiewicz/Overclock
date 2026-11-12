import { Bot, BotOff } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import { useAudioSettings } from '../../../shared/lib/audio';

export interface VoiceToggleButtonProps {
  voiceEnabled?: boolean;
  onToggle?: () => void;
}

export const VoiceToggleButton: React.FC<VoiceToggleButtonProps> = ({
  voiceEnabled: propVoiceEnabled,
  onToggle: propOnToggle,
}) => {
  const storeVoiceEnabled = useAudioSettings((s) => s.voiceEnabled);
  const storeToggle = useAudioSettings((s) => s.toggleVoice);
  const voiceEnabled =
    propVoiceEnabled !== undefined ? propVoiceEnabled : storeVoiceEnabled;
  const toggleVoice = propOnToggle ?? storeToggle;
  const { t } = useI18n();
  const label = voiceEnabled ? t.hud.muteVoice : t.hud.unmuteVoice;

  return (
    <button
      type="button"
      data-testid="voice-toggle-button"
      onClick={toggleVoice}
      aria-pressed={voiceEnabled}
      aria-label={label}
      title={label}
      className="p-1 rounded text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
    >
      {voiceEnabled ? (
        <Bot className="w-4 h-4 text-zinc-300" />
      ) : (
        <BotOff className="w-4 h-4 text-amber-400/80" />
      )}
    </button>
  );
};
