export interface ParticlePool {
  capacity: number;
  aliveCount: number;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  lifespans: Float32Array;
}

export interface EmitParticleBurstOptions {
  origin: [number, number, number];
  count: number;
  color: [number, number, number];
  speed?: number;
  spread?: number;
  gravity?: number;
  life?: number;
  variance?: number;
  size?: number;
  direction?: [number, number, number];
}

export function createParticlePool(capacity = 256): ParticlePool {
  const cap = Math.max(1, capacity);
  return {
    capacity: cap,
    aliveCount: 0,
    positions: new Float32Array(cap * 3),
    velocities: new Float32Array(cap * 3),
    colors: new Float32Array(cap * 3),
    lifespans: new Float32Array(cap * 3),
  };
}

export function emitParticleBurst(
  pool: ParticlePool,
  options: EmitParticleBurstOptions
): number {
  const {
    origin,
    count,
    color,
    speed = 1.4,
    spread = 0.5,
    life = 0.45,
    variance = 0.25,
    size = 0.045,
    direction = [0, 1, 0],
  } = options;

  let emitted = 0;
  const available = pool.capacity - pool.aliveCount;
  const toEmit = Math.min(count, available);

  for (let i = 0; i < toEmit; i++) {
    const idx = pool.aliveCount;
    const idx3 = idx * 3;

    // Position initialized at origin with tiny jitter
    pool.positions[idx3] = origin[0] + (Math.random() - 0.5) * 0.04;
    pool.positions[idx3 + 1] = origin[1] + (Math.random() - 0.5) * 0.04;
    pool.positions[idx3 + 2] = origin[2] + (Math.random() - 0.5) * 0.04;

    // Velocity combines directional bias and spherical spread
    const rx = (Math.random() - 0.5) * spread;
    const ry = (Math.random() - 0.5) * spread;
    const rz = (Math.random() - 0.5) * spread;

    pool.velocities[idx3] = (direction[0] + rx) * speed;
    pool.velocities[idx3 + 1] = (direction[1] + ry) * speed;
    pool.velocities[idx3 + 2] = (direction[2] + rz) * speed;

    // Color
    pool.colors[idx3] = color[0];
    pool.colors[idx3 + 1] = color[1];
    pool.colors[idx3 + 2] = color[2];

    // Lifespan: [remainingLife, maxLife, size]
    const vFactor = variance > 0 ? 1 - variance / 2 + Math.random() * variance : 1;
    const pLife = life * vFactor;
    pool.lifespans[idx3] = pLife;
    pool.lifespans[idx3 + 1] = pLife;
    pool.lifespans[idx3 + 2] = size;

    pool.aliveCount++;
    emitted++;
  }

  return emitted;
}

export function stepParticlePool(
  pool: ParticlePool,
  dtSec: number,
  gravity = 2.0
): void {
  const dt = Math.min(0.1, Math.max(0, Number.isFinite(dtSec) ? dtSec : 0));
  if (dt === 0 || pool.aliveCount === 0) return;

  for (let i = pool.aliveCount - 1; i >= 0; i--) {
    const i3 = i * 3;
    pool.lifespans[i3] -= dt;

    if (pool.lifespans[i3] <= 0) {
      // Expired: swap with last alive particle
      const last = pool.aliveCount - 1;
      if (i < last) {
        const last3 = last * 3;
        pool.positions[i3] = pool.positions[last3];
        pool.positions[i3 + 1] = pool.positions[last3 + 1];
        pool.positions[i3 + 2] = pool.positions[last3 + 2];

        pool.velocities[i3] = pool.velocities[last3];
        pool.velocities[i3 + 1] = pool.velocities[last3 + 1];
        pool.velocities[i3 + 2] = pool.velocities[last3 + 2];

        pool.colors[i3] = pool.colors[last3];
        pool.colors[i3 + 1] = pool.colors[last3 + 1];
        pool.colors[i3 + 2] = pool.colors[last3 + 2];

        pool.lifespans[i3] = pool.lifespans[last3];
        pool.lifespans[i3 + 1] = pool.lifespans[last3 + 1];
        pool.lifespans[i3 + 2] = pool.lifespans[last3 + 2];
      }
      pool.aliveCount--;
      continue;
    }

    // Apply gravity to Y velocity
    pool.velocities[i3 + 1] -= gravity * dt;

    // Apply velocity to positions
    pool.positions[i3] += pool.velocities[i3] * dt;
    pool.positions[i3 + 1] += pool.velocities[i3 + 1] * dt;
    pool.positions[i3 + 2] += pool.velocities[i3 + 2] * dt;
  }
}

export function resetParticlePool(pool: ParticlePool): void {
  pool.aliveCount = 0;
}
