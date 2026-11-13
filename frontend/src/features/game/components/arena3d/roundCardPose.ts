/** Timeline of the round-start protocol card levitating and spinning above the table. */
export const ROUND_CARD_RISE_MS = 500;
export const ROUND_CARD_HOVER_MS = 3500;
export const ROUND_CARD_SINK_MS = 500;
export const ROUND_CARD_TOTAL_MS = ROUND_CARD_RISE_MS + ROUND_CARD_HOVER_MS + ROUND_CARD_SINK_MS;
/** Reduced motion: no rise/spin/sink, the card is just shown hovering for a moment. */
export const ROUND_CARD_REDUCED_MS = 3000;

/** Full turns per second while hovering, so every seat around the table sees the face. */
const SPIN_TURNS_PER_SEC = 0.35;
const TABLE_Y = 0.8;
export const ROUND_CARD_HOVER_Y = 1.42;

export interface RoundCardPose {
  /** Spin around the vertical axis. */
  rotationY: number;
  y: number;
  scale: number;
  done: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;

export function roundCardPose(elapsedMs: number, reducedMotion: boolean): RoundCardPose {
  if (reducedMotion) {
    return { rotationY: 0, y: ROUND_CARD_HOVER_Y, scale: 1, done: elapsedMs >= ROUND_CARD_REDUCED_MS };
  }

  const t = Math.max(0, elapsedMs);
  const rotationY = (t / 1000) * SPIN_TURNS_PER_SEC * Math.PI * 2;
  const sinkStart = ROUND_CARD_RISE_MS + ROUND_CARD_HOVER_MS;

  if (t < ROUND_CARD_RISE_MS) {
    const p = easeOutCubic(clamp01(t / ROUND_CARD_RISE_MS));
    return { rotationY, y: TABLE_Y + (ROUND_CARD_HOVER_Y - TABLE_Y) * p, scale: 0.3 + 0.7 * p, done: false };
  }
  if (t < sinkStart) {
    const bob = Math.sin(((t - ROUND_CARD_RISE_MS) / 1000) * Math.PI * 1.4) * 0.04;
    return { rotationY, y: ROUND_CARD_HOVER_Y + bob, scale: 1, done: false };
  }
  const p = clamp01((t - sinkStart) / ROUND_CARD_SINK_MS);
  const e = easeInCubic(p);
  return {
    rotationY,
    y: ROUND_CARD_HOVER_Y - (ROUND_CARD_HOVER_Y - TABLE_Y) * e,
    scale: 1 - e,
    done: p >= 1,
  };
}
