import { beforeEach, describe, expect, it } from 'vitest';

import { useGfxSettings } from '../../../stores/useGfxSettings';
import { resetParticlePool } from './particlePool';
import {
  arenaVfxPool,
  emitCardLandingSparks,
  emitCardRevealSparks,
  emitCardTrail,
  emitDischargeImpactSparks,
  emitOverloadSmoke,
} from './vfxEmitter';

describe('vfxEmitter (GFX-03)', () => {
  beforeEach(() => {
    resetParticlePool(arenaVfxPool);
    useGfxSettings.setState({ quality: 'high' });
  });

  it('emits card flight trail particles into arenaVfxPool', () => {
    emitCardTrail([0, 1, 0], 'Alpha');
    expect(arenaVfxPool.aliveCount).toBe(2);
    // Alpha protocol green RGB
    expect(arenaVfxPool.colors[0]).toBeCloseTo(0.06, 2);
    expect(arenaVfxPool.colors[1]).toBeCloseTo(0.72, 2);
  });

  it('emits card landing sparks', () => {
    emitCardLandingSparks([0, 0.8, 0]);
    expect(arenaVfxPool.aliveCount).toBe(12);
  });

  it('emits red sparks for bluff reveal and green pulse for clean match', () => {
    emitCardRevealSparks([0, 1, 0], true);
    expect(arenaVfxPool.aliveCount).toBe(18);
    // Red color
    expect(arenaVfxPool.colors[0]).toBeCloseTo(1.0, 1);
    expect(arenaVfxPool.colors[1]).toBeCloseTo(0.15, 1);

    resetParticlePool(arenaVfxPool);
    emitCardRevealSparks([0, 1, 0], false);
    expect(arenaVfxPool.aliveCount).toBe(10);
    // Green color
    expect(arenaVfxPool.colors[1]).toBeCloseTo(0.95, 1);
  });

  it('emits discharge impact sparks and smoke motes', () => {
    emitDischargeImpactSparks([0, 1.2, 0], false);
    expect(arenaVfxPool.aliveCount).toBe(20);

    resetParticlePool(arenaVfxPool);
    emitDischargeImpactSparks([0, 1.2, 0], true);
    expect(arenaVfxPool.aliveCount).toBe(36);

    resetParticlePool(arenaVfxPool);
    emitOverloadSmoke([0, 1.2, 0]);
    expect(arenaVfxPool.aliveCount).toBe(3);
    // Upward velocity with negative gravity
    expect(arenaVfxPool.velocities[1]).toBeGreaterThan(0);
  });

  it('suppresses emissions when gfxQuality is low', () => {
    useGfxSettings.setState({ quality: 'low' });
    emitCardLandingSparks([0, 0.8, 0]);
    emitCardRevealSparks([0, 1, 0], true);
    emitDischargeImpactSparks([0, 1.2, 0], true);
    expect(arenaVfxPool.aliveCount).toBe(0);
  });
});
