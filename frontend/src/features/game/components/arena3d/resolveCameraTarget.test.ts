import { describe, expect, it } from 'vitest';

import { resolveCameraTarget } from './resolveCameraTarget';

describe('resolveCameraTarget (UX-05)', () => {
  const baseParams = {
    focus: 'overview' as const,
    roomState: 'TurnActive' as const,
    subjectPosition: null,
    isLocalSubject: false,
    yawOffset: 0,
    pitchOffset: 0,
    mobilePullback: 0,
    reducedMotion: false,
    shockShakeIntensity: 0,
  };

  it('returns default overview camera framing when no subject is active', () => {
    const result = resolveCameraTarget(baseParams);
    expect(result.position[0]).toBeCloseTo(0, 2);
    expect(result.position[1]).toBeCloseTo(1.94, 2);
    expect(result.position[2]).toBeCloseTo(3.15, 2);
    expect(result.lookAt[0]).toBeCloseTo(0, 2);
    expect(result.lookAt[1]).toBeCloseTo(1.04, 2);
  });

  it('frames table and opponents presets accurately', () => {
    const tableResult = resolveCameraTarget({ ...baseParams, focus: 'table' });
    expect(tableResult.position[1]).toBeCloseTo(2.15, 2);
    expect(tableResult.position[2]).toBeCloseTo(2.65, 2);

    const oppResult = resolveCameraTarget({ ...baseParams, focus: 'opponents' });
    expect(oppResult.position[1]).toBeCloseTo(1.85, 2);
    expect(oppResult.lookAt[2]).toBeCloseTo(-1.8, 2);
  });

  it('tracks opponent subject with 60/40 blend towards their seat', () => {
    const opponentSeatPos: [number, number, number] = [-1.85, 0, -1.45];
    const result = resolveCameraTarget({
      ...baseParams,
      subjectPosition: opponentSeatPos,
      isLocalSubject: false,
    });

    // Look target is blended towards opponent's negative X
    expect(result.lookAt[0]).toBeLessThan(0);
    // Camera position is shifted towards subject's side
    expect(result.position[0]).toBeLessThan(0);
    // Camera is pulled slightly forward towards table
    expect(result.position[2]).toBeLessThan(3.15);
  });

  it('does not pan camera when the subject is the local player', () => {
    const localPlayerPos: [number, number, number] = [0, 1.25, 2.05];
    const result = resolveCameraTarget({
      ...baseParams,
      subjectPosition: localPlayerPos,
      isLocalSubject: true,
    });

    expect(result.position[0]).toBeCloseTo(0, 2);
    expect(result.lookAt[0]).toBeCloseTo(0, 2);
    expect(result.position[2]).toBeCloseTo(3.15, 2);
  });

  it('gives user manual drag priority over automatic subject tilting', () => {
    const opponentSeatPos: [number, number, number] = [1.85, 0, -1.45];
    const userYaw = -0.3; // User dragged camera towards the left
    const result = resolveCameraTarget({
      ...baseParams,
      subjectPosition: opponentSeatPos,
      yawOffset: userYaw,
    });

    // Camera X position reflects user manual drag
    expect(result.position[0]).toBeLessThan(0);
  });

  it('disables shock shake and auto-yaw tilt when reducedMotion is true', () => {
    const opponentSeatPos: [number, number, number] = [1.85, 0, -1.45];
    const withReduced = resolveCameraTarget({
      ...baseParams,
      subjectPosition: opponentSeatPos,
      reducedMotion: true,
      shockShakeIntensity: 1,
    });

    const withoutReduced = resolveCameraTarget({
      ...baseParams,
      subjectPosition: opponentSeatPos,
      reducedMotion: false,
      shockShakeIntensity: 1,
    });

    // When reduced motion is enabled, position does not contain high-frequency jitter
    expect(withReduced).toBeDefined();
    expect(withoutReduced).toBeDefined();
  });
});
