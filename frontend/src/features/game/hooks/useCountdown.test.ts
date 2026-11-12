import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { computeCountdown, startCountdown } from './useCountdown';

describe('computeCountdown', () => {
  it('is idle without a deadline', () => {
    expect(computeCountdown(null, 0, 15).isActive).toBe(false);
  });

  it('rounds seconds up and flags the last 5 seconds as critical', () => {
    const deadline = 15_000;
    expect(computeCountdown(deadline, 0, 15)).toMatchObject({
      secondsLeft: 15,
      fraction: 1,
      isCritical: false,
    });
    expect(computeCountdown(deadline, 10_000, 15)).toMatchObject({
      secondsLeft: 5,
      isCritical: true,
    });
    expect(computeCountdown(deadline, 14_100, 15).secondsLeft).toBe(1);
  });

  it('is not critical once expired and clamps fraction', () => {
    const state = computeCountdown(1_000, 5_000, 15);
    expect(state).toMatchObject({ secondsLeft: 0, fraction: 0, isCritical: false });
  });
});

describe('startCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks every 250 ms until stopped', () => {
    const onTick = vi.fn();
    const stop = startCountdown(Date.now() + 8_000, 15, onTick);
    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3_000);
    expect(onTick).toHaveBeenCalledTimes(13);
    expect(onTick.mock.calls.at(-1)?.[0]).toMatchObject({ secondsLeft: 5, isCritical: true });

    stop();
    vi.advanceTimersByTime(2_000);
    expect(onTick).toHaveBeenCalledTimes(13);
  });
});
