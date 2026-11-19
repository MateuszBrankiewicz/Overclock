import { prefersReducedMotion } from '../../../../../shared/lib/motion';
import { useGfxSettings } from '../../../stores/useGfxSettings';
import {
  createParticlePool,
  emitParticleBurst,
  type ParticlePool,
} from './particlePool';

export const arenaVfxPool: ParticlePool = createParticlePool(256);

function isVfxDisabled(): boolean {
  if (prefersReducedMotion()) return true;
  try {
    return useGfxSettings.getState().quality === 'low';
  } catch {
    return false;
  }
}

const PROTOCOL_COLOR_RGB: Record<string, [number, number, number]> = {
  Alpha: [0.06, 0.72, 0.51],
  Beta: [0.98, 0.45, 0.09],
  Gamma: [0.22, 0.74, 0.97],
  Glitch: [0.93, 0.28, 0.6],
  Corrupted: [0.94, 0.27, 0.27],
};

export function emitCardTrail(
  origin: [number, number, number],
  protocol: string
): void {
  if (isVfxDisabled()) return;
  const color = PROTOCOL_COLOR_RGB[protocol] ?? [0.2, 0.8, 0.9];
  emitParticleBurst(arenaVfxPool, {
    origin,
    count: 2,
    color,
    speed: 0.35,
    spread: 0.2,
    gravity: 0.3,
    life: 0.35,
    size: 0.035,
    direction: [0, 0.1, 0],
  });
}

export function emitCardLandingSparks(origin: [number, number, number]): void {
  if (isVfxDisabled()) return;
  emitParticleBurst(arenaVfxPool, {
    origin,
    count: 12,
    color: [0.4, 0.9, 0.7],
    speed: 1.6,
    spread: 0.8,
    gravity: 3.5,
    life: 0.35,
    size: 0.04,
    direction: [0, 1, 0],
  });
}

export function emitCardRevealSparks(
  origin: [number, number, number],
  isBluff: boolean
): void {
  if (isVfxDisabled()) return;
  if (isBluff) {
    // Red harsh sparks and electrical crackle
    emitParticleBurst(arenaVfxPool, {
      origin,
      count: 18,
      color: [1.0, 0.15, 0.15],
      speed: 1.8,
      spread: 0.9,
      gravity: 4.0,
      life: 0.45,
      size: 0.05,
      direction: [0, 1.2, 0],
    });
  } else {
    // Soft green expansion pulse
    emitParticleBurst(arenaVfxPool, {
      origin,
      count: 10,
      color: [0.15, 0.95, 0.4],
      speed: 0.8,
      spread: 0.7,
      gravity: 1.0,
      life: 0.4,
      size: 0.04,
      direction: [0, 0.5, 0],
    });
  }
}

export function emitDischargeImpactSparks(
  origin: [number, number, number],
  isOverloaded: boolean
): void {
  if (isVfxDisabled()) return;
  emitParticleBurst(arenaVfxPool, {
    origin,
    count: isOverloaded ? 36 : 20,
    color: isOverloaded ? [1.0, 0.5, 0.1] : [0.35, 0.85, 1.0],
    speed: isOverloaded ? 2.4 : 1.8,
    spread: 1.2,
    gravity: 4.8,
    life: 0.45,
    size: 0.055,
    direction: [0, 1, 0],
  });
}

export function emitOverloadSmoke(origin: [number, number, number]): void {
  if (isVfxDisabled()) return;
  // Slow rising grey/amber embers
  emitParticleBurst(arenaVfxPool, {
    origin,
    count: 3,
    color: [0.55, 0.5, 0.45],
    speed: 0.3,
    spread: 0.25,
    gravity: -0.4, // float upwards
    life: 1.2,
    size: 0.07,
    direction: [0, 0.8, 0],
  });
}
