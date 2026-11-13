import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkWebGLAvailable } from './webgl';

describe('checkWebGLAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns false in JSDOM / headless test environments', () => {
    expect(checkWebGLAvailable()).toBe(false);
  });

  it('returns false when window or document is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(checkWebGLAvailable()).toBe(false);
  });
});
