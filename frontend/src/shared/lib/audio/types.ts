export type AudioEffectName =
  | 'cardClick'
  | 'traceSiren'
  | 'voltageBuzz'
  | 'discharge'
  | 'roundStart'
  | 'eliminated'
  | 'voiceBlip'
  | 'cardSelect'
  | 'yourTurn'
  | 'turnTick'
  | 'exploitActivate'
  | 'survived'
  | 'victory';

export type VoiceBlipType = 'lowSweep' | 'zap' | 'modem' | 'glitch';

export interface AudioEffectParams {
  riskLevel?: number;
  blip?: VoiceBlipType;
  selected?: boolean;
  secondsLeft?: number;
  rising?: boolean;
  duration?: number;
  [key: string]: unknown;
}
