import { afterEach, describe, expect, it, vi } from 'vitest';

import { vibrate } from './haptics';

describe('haptics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op when navigator.vibrate is unsupported', () => {
    vi.stubGlobal('navigator', {});
    expect(vibrate('shock')).toBe(false);
  });

  it('is a no-op when navigator is missing', () => {
    vi.stubGlobal('navigator', undefined);
    expect(vibrate('shock')).toBe(false);
  });

  it('calls navigator.vibrate with the right patterns', () => {
    const spy = vi.fn((_p: VibratePattern) => true);
    vi.stubGlobal('navigator', { vibrate: spy });
    expect(vibrate('shock')).toBe(true);
    expect(spy).toHaveBeenLastCalledWith(60);
    vibrate('overload');
    expect(spy).toHaveBeenLastCalledWith([200, 80, 200, 80, 400]);
    vibrate('turn');
    expect(spy).toHaveBeenLastCalledWith(20);
    vibrate('select');
    expect(spy).toHaveBeenLastCalledWith(10);
  });

  it('does nothing when prefers-reduced-motion is set', () => {
    const spy = vi.fn((_p: VibratePattern) => true);
    vi.stubGlobal('navigator', { vibrate: spy });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(vibrate('shock')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows errors thrown by vibrate', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked');
      },
    });
    expect(vibrate('shock')).toBe(false);
  });
});
