export type AudioEffectName =
  | 'cardClick'
  | 'traceSiren'
  | 'voltageBuzz'
  | 'discharge'
  | 'roundStart'
  | 'eliminated';

export interface AudioEffectParams {
  riskLevel?: number;
  [key: string]: unknown;
}
