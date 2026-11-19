import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import type { ShowdownOperator } from './showdownParts';

export type ShowdownStage =
  'scan' | 'verdict' | 'decision' | 'charge' | 'roll' | 'strike';

/**
 * `bar` captions the 3D scene, which carries the cards, the drum and the roll.
 * `expanded` adds those to the 2D panel for clients without WebGL (`ArenaFallback`).
 */
export type ShowdownVariant = 'bar' | 'expanded';

export interface ShowdownTrace {
  accuser: ShowdownOperator;
  accused: ShowdownOperator;
  declaredProtocol: CardProtocol;
  cards: PlayerCard[];
  bluffDetected: boolean;
}

export interface ShowdownDischarge {
  startedAtMs: number;
  roll: number;
  riskLevel: number;
  overloaded: boolean;
  resultingRiskLevel: number;
}

export interface ShowdownDecision {
  deadlineUtc: string | null;
  canUseGroundWire: boolean;
  onDeployGroundWire?: () => void;
  onTriggerDischarge?: () => void;
}

export interface BluffShowdownProps {
  /** The trace being settled; null when a voltage test runs without one. */
  trace: ShowdownTrace | null;
  /** Set while the contested cards are being revealed. */
  revealStartedAtMs: number | null;
  /** Set while the discharge roll is playing. */
  discharge: ShowdownDischarge | null;
  /** Operator under the voltage test. */
  target: ShowdownOperator | null;
  /** Set while the tested operator still has to decide. */
  decision: ShowdownDecision | null;
  onSkip?: () => void;
  variant?: ShowdownVariant;
}

export const clampRisk = (risk: number) => Math.max(1, Math.min(6, risk));

export const STEP_OF: Record<ShowdownStage, number> = {
  scan: 0,
  verdict: 1,
  decision: 2,
  charge: 2,
  roll: 3,
  strike: 3,
};
