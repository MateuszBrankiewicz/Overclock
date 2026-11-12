import type { CharacterId } from '../../../features/game/utils/characterCatalog';
import type { VoiceBlipType } from './types';

export interface VoiceHint {
  preferredVoiceIndex?: number;
}

export interface VoiceProfile {
  pitch: number;
  rate: number;
  volume: number;
  blip: VoiceBlipType;
  voiceHint?: VoiceHint;
}

export const VOICE_PROFILES: Record<CharacterId, VoiceProfile> = {
  ghost: {
    pitch: 0.4,
    rate: 0.85,
    volume: 0.9,
    blip: 'lowSweep',
    voiceHint: { preferredVoiceIndex: 0 },
  },
  volt: {
    pitch: 1.6,
    rate: 1.25,
    volume: 1.0,
    blip: 'zap',
    voiceHint: { preferredVoiceIndex: 1 },
  },
  proxy: {
    pitch: 1.0,
    rate: 1.0,
    volume: 0.9,
    blip: 'modem',
    voiceHint: { preferredVoiceIndex: 2 },
  },
  null: {
    pitch: 0.7,
    rate: 0.75,
    volume: 1.0,
    blip: 'glitch',
    voiceHint: { preferredVoiceIndex: 3 },
  },
};
