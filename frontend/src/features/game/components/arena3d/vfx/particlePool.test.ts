import { describe, expect, it } from 'vitest';

import {
  createParticlePool,
  emitParticleBurst,
  resetParticlePool,
  stepParticlePool,
} from './particlePool';

describe('particlePool (GFX-03)', () => {
  it('creates an empty particle pool with pre-allocated buffers', () => {
    const pool = createParticlePool(64);
    expect(pool.capacity).toBe(64);
    expect(pool.aliveCount).toBe(0);
    expect(pool.positions.length).toBe(64 * 3);
    expect(pool.velocities.length).toBe(64 * 3);
    expect(pool.colors.length).toBe(64 * 3);
    expect(pool.lifespans.length).toBe(64 * 3);
  });

  it('emits particles up to pool capacity without overflowing', () => {
    const pool = createParticlePool(10);
    const emittedFirst = emitParticleBurst(pool, {
      origin: [0, 1, 0],
      count: 7,
      color: [1, 0.2, 0.2],
      life: 0.5,
    });
    expect(emittedFirst).toBe(7);
    expect(pool.aliveCount).toBe(7);

    // Requesting 5 more should cap at remaining capacity (3)
    const emittedSecond = emitParticleBurst(pool, {
      origin: [0, 1, 0],
      count: 5,
      color: [0.2, 1, 0.2],
      life: 0.5,
    });
    expect(emittedSecond).toBe(3);
    expect(pool.aliveCount).toBe(10);

    // Further emissions when full emit 0
    const emittedThird = emitParticleBurst(pool, {
      origin: [0, 1, 0],
      count: 2,
      color: [1, 1, 1],
    });
    expect(emittedThird).toBe(0);
    expect(pool.aliveCount).toBe(10);
  });

  it('simulates particle physics and decays life down to zero without NaN', () => {
    const pool = createParticlePool(16);
    emitParticleBurst(pool, {
      origin: [1, 2, 3],
      count: 5,
      color: [0, 1, 0],
      speed: 2,
      gravity: 5,
      life: 0.2,
      variance: 0,
    });
    expect(pool.aliveCount).toBe(5);

    // Initial position should be near origin
    expect(pool.positions[0]).toBeCloseTo(1, 1);
    expect(pool.positions[1]).toBeCloseTo(2, 1);
    expect(pool.positions[2]).toBeCloseTo(3, 1);

    // Step simulation by 0.1s
    stepParticlePool(pool, 0.1, 5);
    expect(pool.aliveCount).toBe(5);

    for (let i = 0; i < pool.aliveCount * 3; i++) {
      expect(Number.isNaN(pool.positions[i])).toBe(false);
      expect(Number.isNaN(pool.velocities[i])).toBe(false);
    }

    // Step by another 0.1s (total 0.2s = 0.2s life) and 0.05s -> all particles should decay
    stepParticlePool(pool, 0.1, 5);
    stepParticlePool(pool, 0.05, 5);
    expect(pool.aliveCount).toBe(0);
  });

  it('safely handles abnormal delta times (NaN, negative, frame spikes)', () => {
    const pool = createParticlePool(8);
    emitParticleBurst(pool, {
      origin: [0, 0, 0],
      count: 3,
      color: [1, 1, 0],
      life: 1.0,
    });

    stepParticlePool(pool, NaN);
    expect(pool.aliveCount).toBe(3);

    stepParticlePool(pool, -0.5);
    expect(pool.aliveCount).toBe(3);

    stepParticlePool(pool, 100); // Massive frame spike clamped to 0.1s
    expect(pool.aliveCount).toBe(3);
    expect(Number.isNaN(pool.positions[0])).toBe(false);
  });

  it('resets pool correctly to 0 alive particles', () => {
    const pool = createParticlePool(16);
    emitParticleBurst(pool, {
      origin: [0, 0, 0],
      count: 8,
      color: [1, 0, 0],
    });
    expect(pool.aliveCount).toBe(8);

    resetParticlePool(pool);
    expect(pool.aliveCount).toBe(0);
  });
});
