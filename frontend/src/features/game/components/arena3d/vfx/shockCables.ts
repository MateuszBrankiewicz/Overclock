/**
 * Pure geometry and timing for the voltage-test cables (showdown beats 5-9): two live leads run
 * from the table rim to the tested operator, charge up while the d6 rolls and on the strike give
 * a light jolt (survived) or a heavy one (overload, elimination). Nothing hovers over the table
 * centre, so no operator is hidden behind the effect.
 */

export type Vec3 = [number, number, number];

/** Table-top height and the radius where the cables leave the rim. */
export const CABLE_TABLE_Y = 0.8;
export const CABLE_RIM_RADIUS = 1.9;
/** Half the distance between the two leads, at the rim and at the body. */
const RIM_SPREAD = 0.24;
const BODY_SPREAD = 0.17;
/** How far below the straight line the slack cable sags. */
const CABLE_SAG = 0.22;

/** Strike flashes: a short tingle when the insulation holds, a long heavy surge on overload. */
export const LIGHT_SHOCK_MS = 700;
export const HEAVY_SHOCK_MS = 1600;

export interface CablePath {
  /** Rim anchor, sagging midpoint and attachment point on the body. */
  points: [Vec3, Vec3, Vec3];
}

/** Two leads from the table rim, on the operator's side, to their shoulders. */
export function shockCablePaths(target: Vec3): [CablePath, CablePath] {
  const [tx, ty, tz] = target;
  const horizontal = Math.hypot(tx, tz);
  // Unit vector from the table centre towards the operator, and its horizontal perpendicular.
  const dx = horizontal > 1e-6 ? tx / horizontal : 0;
  const dz = horizontal > 1e-6 ? tz / horizontal : 1;
  const px = -dz;
  const pz = dx;
  const rimRadius = Math.min(CABLE_RIM_RADIUS, Math.max(0, horizontal - 0.3));

  const lead = (side: 1 | -1): CablePath => {
    const rim: Vec3 = [
      dx * rimRadius + px * RIM_SPREAD * side,
      CABLE_TABLE_Y,
      dz * rimRadius + pz * RIM_SPREAD * side,
    ];
    const body: Vec3 = [tx + px * BODY_SPREAD * side, ty, tz + pz * BODY_SPREAD * side];
    const mid: Vec3 = [
      (rim[0] + body[0]) / 2,
      Math.min(rim[1], body[1]) - CABLE_SAG,
      (rim[2] + body[2]) / 2,
    ];
    return { points: [rim, mid, body] };
  };

  return [lead(-1), lead(1)];
}

export interface CableState {
  /** 0 while armed, rising to 1 right before the strike. */
  charge: number;
  /** Milliseconds since the strike, or null before it. */
  sinceStrikeMs: number | null;
  /** 0..1 strength of the strike flash (0 before the strike and once it has faded). */
  shock: number;
}

/**
 * Charge and strike state at `nowMs`. Before the strike nothing depends on `overloaded`, so the
 * cables never spoil the roll.
 */
export function shockCableState(
  nowMs: number,
  chargeStartedAtMs: number | null,
  strikeAtMs: number | null,
  overloaded: boolean
): CableState {
  if (chargeStartedAtMs === null || strikeAtMs === null) {
    return { charge: 0, sinceStrikeMs: null, shock: 0 };
  }
  if (nowMs < strikeAtMs) {
    const span = Math.max(1, strikeAtMs - chargeStartedAtMs);
    const charge = Math.min(1, Math.max(0, (nowMs - chargeStartedAtMs) / span));
    return { charge, sinceStrikeMs: null, shock: 0 };
  }
  const sinceStrikeMs = nowMs - strikeAtMs;
  const duration = overloaded ? HEAVY_SHOCK_MS : LIGHT_SHOCK_MS;
  const peak = overloaded ? 1 : 0.45;
  const shock = sinceStrikeMs >= duration ? 0 : peak * (1 - sinceStrikeMs / duration);
  return { charge: 1, sinceStrikeMs, shock };
}

export interface CableTargetInput {
  /** Operator of the running discharge cinematic. */
  dischargePlayerId: string | null;
  /** Operator facing the voltage test (pending, queued or the trace loser). */
  voltageTargetPlayerId: string | null;
  /** Whether a trace reveal is on screen at all. */
  isRevealOnScreen: boolean;
  /** Whether every revealed card has stopped turning. */
  areRevealCardsSettled: boolean;
}

/**
 * Who the leads are clamped on. Never while the reveal cards are still turning (that would spoil the
 * verdict); from then on they stay on the tested operator through the wait and the discharge.
 */
export function resolveCableTargetId({
  dischargePlayerId,
  voltageTargetPlayerId,
  isRevealOnScreen,
  areRevealCardsSettled,
}: CableTargetInput): string | null {
  if (dischargePlayerId) return dischargePlayerId;
  if (isRevealOnScreen && !areRevealCardsSettled) return null;
  return voltageTargetPlayerId;
}
