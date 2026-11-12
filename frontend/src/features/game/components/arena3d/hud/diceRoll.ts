export const DICE_FRAMES = 12;
export const DICE_FRAME_MS = 85;

/**
 * Deterministic face sequence of `frames` faces ending on `roll`; no face
 * repeats back-to-back so the cycling reads as motion.
 */
export function buildDiceSequence(roll: number, frames: number = DICE_FRAMES): number[] {
  const final = Math.min(6, Math.max(1, Math.round(roll)));
  const seq: number[] = [];
  let face = final;
  for (let i = 0; i < frames - 1; i++) {
    face = ((face + 1 + ((i * 5 + final) % 4)) % 6) + 1; // 1..6, step 2..5
    seq.push(face);
  }
  seq.push(final);
  for (let i = seq.length - 2; i >= 0; i--) {
    if (seq[i] === seq[i + 1]) seq[i] = (seq[i] % 6) + 1;
  }
  return seq;
}
