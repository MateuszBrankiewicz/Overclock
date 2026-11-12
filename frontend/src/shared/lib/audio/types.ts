export type AudioEffectName =
  | 'cardClick'
  | 'traceSiren'
  | 'voltageBuzz'
  | 'discharge'
  | 'roundStart'
  | 'eliminated'
  | 'voiceBlip';

export type VoiceBlipType = 'lowSweep' | 'zap' | 'modem' | 'glitch';

export interface AudioEffectParams {
  riskLevel?: number;
  blip?: VoiceBlipType;
  [key: string]: unknown;
}
