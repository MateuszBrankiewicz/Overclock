import { describe, expect, it } from 'vitest';

import { computeDeathPose, computeShockPose } from './deathPose';

describe('deathPose Kinematics Engine', () => {
  it('correctly transitions through all death phases across time', () => {
    // 1. Anticipation (0.0s - 0.35s)
    const p1 = computeDeathPose(0.15, 0);
    expect(p1.phase).toBe('anticipation');
    expect(p1.isShockActive).toBe(false);
    expect(p1.isVisorDead).toBe(false);

    // 2. Impact lock & arching back (0.35s - 0.55s)
    const p2 = computeDeathPose(0.45, 0);
    expect(p2.phase).toBe('impact_lock');
    expect(p2.isShockActive).toBe(true);
    expect(p2.bodyRotation[0]).toBeLessThan(0); // Arched backwards

    // 3. High-voltage seizure spasm (0.55s - 1.1s)
    const p3 = computeDeathPose(0.8, 0);
    expect(p3.phase).toBe('spasm');
    expect(p3.isShockActive).toBe(true);

    // 4. Lurch forward onto table (1.1s - 1.5s)
    const p4 = computeDeathPose(1.4, 0);
    expect(p4.phase).toBe('table_slam');
    expect(p4.isShockActive).toBe(false);
    expect(p4.isVisorDead).toBe(true);
    expect(p4.bodyPosition[2]).toBeGreaterThan(0.5); // Lurching towards table center
    expect(p4.bodyRotation[0]).toBeGreaterThan(0.5); // Face down onto tabletop

    // 5. Resting on tabletop with bounce (1.5s - 2.1s)
    const p5 = computeDeathPose(1.8, 0);
    expect(p5.phase).toBe('table_rest');
    expect(p5.bodyPosition[2]).toBeGreaterThan(1.1); // On table surface
    expect(p5.bodyPosition[1]).toBeCloseTo(-0.28, 1);

    // 6. Sliding and tumbling sideways off table (2.1s - 2.9s)
    const p6 = computeDeathPose(2.5, 0);
    expect(p6.phase).toBe('floor_tumble');
    expect(p6.bodyPosition[1]).toBeLessThan(-0.3); // Dropping towards floor

    // 7. Settled dead on bunker floor (2.9s+)
    const p7 = computeDeathPose(3.5, 0);
    expect(p7.phase).toBe('floor_settled');
    expect(p7.bodyPosition[1]).toBeLessThan(-0.8); // Settled on floor
    expect(p7.isVisorDead).toBe(true);
  });

  it('determines slide direction deterministically based on seed', () => {
    const leftDrop = computeDeathPose(3.5, 1);
    const rightDrop = computeDeathPose(3.5, 2);

    expect(leftDrop.bodyPosition[0]).toBeLessThan(0);
    expect(rightDrop.bodyPosition[0]).toBeGreaterThan(0);
  });

  it('correctly simulates shock and recovery when operator survives voltage testing', () => {
    const s1 = computeShockPose(0.45, 0);
    expect(s1.phase).toBe('impact_lock');
    expect(s1.isShockActive).toBe(true);

    const s2 = computeShockPose(0.8, 0);
    expect(s2.phase).toBe('spasm');
    expect(s2.isShockActive).toBe(true);

    const s3 = computeShockPose(1.2, 0);
    expect(s3.phase).toBe('settled');
    expect(s3.isShockActive).toBe(false);
    expect(s3.bodyPosition).toEqual([0, 0, 0]);
  });

  it('guarantees smooth continuity across phase boundaries without abrupt jumps', () => {
    const eps = 0.001;
    // Boundary 0.55s (impact_lock -> spasm)
    const before055 = computeDeathPose(0.55 - eps, 42);
    const after055 = computeDeathPose(0.55 + eps, 42);
    expect(Math.abs(before055.bodyRotation[0] - after055.bodyRotation[0])).toBeLessThan(0.05);

    // Boundary 1.1s (spasm -> table_slam)
    const before11 = computeDeathPose(1.1 - eps, 42);
    const after11 = computeDeathPose(1.1 + eps, 42);
    expect(Math.abs(before11.bodyPosition[2] - after11.bodyPosition[2])).toBeLessThan(0.05);

    // Boundary 1.5s (table_slam -> table_rest)
    const before15 = computeDeathPose(1.5 - eps, 42);
    const after15 = computeDeathPose(1.5 + eps, 42);
    expect(Math.abs(before15.bodyPosition[2] - after15.bodyPosition[2])).toBeLessThan(0.05);
  });
});
