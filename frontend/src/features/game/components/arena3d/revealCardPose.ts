/**
 * Pure layout for the trace reveal (showdown beats 2-3): the contested cards leave the pile and
 * stand up in front of the camera, sized to the frame, so no HUD (the showdown bar at the bottom)
 * ever covers them, whichever camera mode is active and whatever the aspect ratio.
 */

/** Unscaled card face and the spacing between card centres (scene units). */
export const REVEAL_CARD_WIDTH = 0.42;
export const REVEAL_CARD_HEIGHT = 0.6;
export const REVEAL_CARD_SPACING = 0.5;

/** Beat 2 window, relative to the reveal start: cards fly from the pile to the presentation pose. */
export const REVEAL_LIFT_START_MS = 350;
export const REVEAL_LIFT_END_MS = 1000;

/** Card flip duration; the last card turns 30% slower for the final beat. */
export const REVEAL_FLIP_MS = 380;
export const REVEAL_LAST_FLIP_MS = Math.round(REVEAL_FLIP_MS * 1.3);

export interface PresentationLayout {
  /** Distance in front of the camera where the row of cards stands. */
  distance: number;
  /** Uniform scale applied to every card. */
  scale: number;
  /** Shift of the row above the screen centre, along the camera's up axis. */
  lift: number;
}

/** Where the cards stand: a row as wide as three cards fills ~38% of a landscape frame. */
export function presentationLayout(
  fovDeg: number,
  aspect: number,
  distanceToTable: number
): PresentationLayout {
  const distance = Math.min(3, Math.max(1.2, distanceToTable * 0.7));
  const visibleHeight = 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
  const visibleWidth = visibleHeight * Math.max(0.3, aspect);
  const threeCardRow = 2 * REVEAL_CARD_SPACING + REVEAL_CARD_WIDTH;
  const widthShare = aspect >= 1 ? 0.38 : 0.8;
  const byWidth = (visibleWidth * widthShare) / threeCardRow;
  const byHeight = (visibleHeight * 0.3) / REVEAL_CARD_HEIGHT;
  return {
    distance,
    scale: Math.min(byWidth, byHeight),
    // Centre the row a bit above the middle: the bottom of the frame belongs to the HUD.
    lift: visibleHeight * 0.08,
  };
}

/** Horizontal offset of card `index` in a row of `total`, before scaling. */
export function revealCardOffsetX(index: number, total: number): number {
  return (index - (total - 1) / 2) * REVEAL_CARD_SPACING;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 0 on the pile, 1 in the presentation pose; slightly staggered per card. */
export function revealLiftProgress(
  elapsedMs: number,
  index: number,
  reducedMotion: boolean
): number {
  if (reducedMotion) return 1;
  const start = REVEAL_LIFT_START_MS + index * 60;
  return easeInOutCubic(clamp01((elapsedMs - start) / (REVEAL_LIFT_END_MS - start)));
}

/** 0 face-down (back to the camera), 1 face-up; the last card turns slower. */
export function revealFlipProgress(
  nowMs: number,
  flipAtMs: number,
  isLast: boolean,
  reducedMotion: boolean
): number {
  if (reducedMotion) return nowMs >= flipAtMs ? 1 : 0;
  const duration = isLast ? REVEAL_LAST_FLIP_MS : REVEAL_FLIP_MS;
  return easeOutCubic(clamp01((nowMs - flipAtMs) / duration));
}
