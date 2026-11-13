import { describe, expect, it } from 'vitest';

import { revealCardFlipAtMs, verdictVisibleAtMs } from '../../utils/cinematicTiming';
import {
  presentationLayout,
  REVEAL_CARD_HEIGHT,
  REVEAL_CARD_SPACING,
  REVEAL_CARD_WIDTH,
  REVEAL_FLIP_MS,
  REVEAL_LAST_FLIP_MS,
  REVEAL_LIFT_END_MS,
  REVEAL_LIFT_START_MS,
  revealCardOffsetX,
  revealCardsSettledAtMs,
  revealFlipProgress,
  revealLiftProgress,
} from './revealCardPose';

const visible = (fov: number, aspect: number, distance: number) => {
  const h = 2 * distance * Math.tan((fov * Math.PI) / 360);
  return { h, w: h * aspect };
};

describe('presentationLayout', () => {
  it('makes three cards fill about 38% of a landscape frame', () => {
    const layout = presentationLayout(50, 1366 / 768, 3.4);
    const { w, h } = visible(50, 1366 / 768, layout.distance);
    const rowWidth = (2 * REVEAL_CARD_SPACING + REVEAL_CARD_WIDTH) * layout.scale;

    expect(rowWidth / w).toBeGreaterThan(0.34);
    expect(rowWidth / w).toBeLessThanOrEqual(0.4);
    expect((REVEAL_CARD_HEIGHT * layout.scale) / h).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('keeps the cards above the bottom HUD on a portrait phone', () => {
    const layout = presentationLayout(50, 390 / 844, 3.4);
    const { w, h } = visible(50, 390 / 844, layout.distance);
    const rowWidth = (2 * REVEAL_CARD_SPACING + REVEAL_CARD_WIDTH) * layout.scale;
    const cardBottom = layout.lift - (REVEAL_CARD_HEIGHT * layout.scale) / 2;

    expect(rowWidth).toBeLessThan(w);
    // Bottom edge of the cards stays above the screen centre minus 15% of the frame:
    // the showdown bar and the verdict stamp live below that.
    expect(cardBottom / h).toBeGreaterThan(-0.15);
  });

  it('clamps the distance in front of the camera', () => {
    expect(presentationLayout(50, 1.6, 0.5).distance).toBe(1.2);
    expect(presentationLayout(50, 1.6, 20).distance).toBe(3);
  });
});

describe('reveal card timing', () => {
  it('centres the row around the middle card', () => {
    expect(revealCardOffsetX(1, 3)).toBe(0);
    expect(revealCardOffsetX(0, 3)).toBe(-REVEAL_CARD_SPACING);
    expect(revealCardOffsetX(0, 1)).toBe(0);
  });

  it('lifts the cards from the pile during beat 2 only', () => {
    expect(revealLiftProgress(REVEAL_LIFT_START_MS - 1, 0, false)).toBe(0);
    expect(revealLiftProgress(REVEAL_LIFT_END_MS, 0, false)).toBe(1);
    expect(revealLiftProgress(REVEAL_LIFT_END_MS, 2, false)).toBe(1);
    expect(revealLiftProgress(0, 0, true)).toBe(1);
  });

  it('turns the last card 30% slower', () => {
    expect(REVEAL_LAST_FLIP_MS).toBe(Math.round(REVEAL_FLIP_MS * 1.3));
    expect(revealFlipProgress(REVEAL_FLIP_MS, 0, false, false)).toBe(1);
    expect(revealFlipProgress(REVEAL_FLIP_MS, 0, true, false)).toBeLessThan(1);
    expect(revealFlipProgress(-1, 0, false, false)).toBe(0);
  });

  it('snaps the flip under reduced motion without flipping early', () => {
    expect(revealFlipProgress(-1, 0, true, true)).toBe(0);
    expect(revealFlipProgress(0, 0, true, true)).toBe(1);
  });
});

describe('revealCardsSettledAtMs', () => {
  it('lands when the slower last flip has finished, after the verdict stamp', () => {
    const settled = revealCardsSettledAtMs(3, 1000);
    expect(settled).toBe(revealCardFlipAtMs(2, 1000) + REVEAL_LAST_FLIP_MS);
    expect(revealFlipProgress(settled, revealCardFlipAtMs(2, 1000), true, false)).toBe(1);
    expect(settled).toBeGreaterThan(verdictVisibleAtMs(3, 1000));
  });

  it('is the last flip itself under reduced motion', () => {
    expect(revealCardsSettledAtMs(2, 0, true)).toBe(revealCardFlipAtMs(1, 0));
  });
});
