import { describe, expect, it } from 'vitest';

import {
  ROUND_CARD_HOVER_MS,
  ROUND_CARD_HOVER_Y,
  ROUND_CARD_REDUCED_MS,
  ROUND_CARD_RISE_MS,
  ROUND_CARD_TOTAL_MS,
  roundCardPose,
} from './roundCardPose';

describe('roundCardPose', () => {
  it('rises from the table and levitates above it at full size', () => {
    const start = roundCardPose(0, false);
    const hover = roundCardPose(ROUND_CARD_RISE_MS + 100, false);
    expect(start.y).toBeLessThan(hover.y);
    expect(start.scale).toBeLessThan(1);
    expect(hover.scale).toBe(1);
    expect(hover.y).toBeCloseTo(ROUND_CARD_HOVER_Y, 1);
  });

  it('keeps spinning while hovering so every seat sees the face', () => {
    const a = roundCardPose(ROUND_CARD_RISE_MS + 200, false).rotationY;
    const b = roundCardPose(ROUND_CARD_RISE_MS + ROUND_CARD_HOVER_MS - 200, false).rotationY;
    expect(b - a).toBeGreaterThan(Math.PI);
  });

  it('disappears once the timeline is over instead of staying on the table', () => {
    expect(roundCardPose(ROUND_CARD_TOTAL_MS - 1, false).done).toBe(false);
    const end = roundCardPose(ROUND_CARD_TOTAL_MS, false);
    expect(end.done).toBe(true);
    expect(end.scale).toBeCloseTo(0);
  });

  it('hovers still without spinning when reduced motion is preferred', () => {
    const pose = roundCardPose(1000, true);
    expect(pose.rotationY).toBe(0);
    expect(pose.scale).toBe(1);
    expect(roundCardPose(ROUND_CARD_REDUCED_MS, true).done).toBe(true);
  });
});
