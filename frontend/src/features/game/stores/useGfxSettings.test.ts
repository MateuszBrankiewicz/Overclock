import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getInitialGfxQuality,
  STORAGE_KEY_GFX_QUALITY,
  useGfxSettings,
} from './useGfxSettings';

describe('useGfxSettings store (GFX-01)', () => {
  let fakeStorage: Record<string, string>;
  let mockStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, val: string) => void;
    clear: () => void;
  };
  let mockMatchMedia: (query: string) => { matches: boolean; media: string };

  beforeEach(() => {
    fakeStorage = {};
    mockStorage = {
      getItem: vi.fn((key: string) => fakeStorage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        fakeStorage[key] = val;
      }),
      clear: vi.fn(() => {
        fakeStorage = {};
      }),
    };

    mockMatchMedia = vi.fn(() => ({ matches: false, media: '' }));

    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', {
      matchMedia: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads stored preference from localStorage', () => {
    fakeStorage[STORAGE_KEY_GFX_QUALITY] = 'low';
    expect(getInitialGfxQuality()).toBe('low');

    fakeStorage[STORAGE_KEY_GFX_QUALITY] = 'high';
    expect(getInitialGfxQuality()).toBe('high');
  });

  it('defaults to low when prefers-reduced-motion matches', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
      }),
    });

    expect(getInitialGfxQuality()).toBe('low');
  });

  it('defaults to low when pointer: coarse matches', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('pointer: coarse'),
        media: query,
      }),
    });

    expect(getInitialGfxQuality()).toBe('low');
  });

  it('defaults to high when fine pointer and no reduced motion', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false, media: '' }),
    });

    expect(getInitialGfxQuality()).toBe('high');
  });

  it('handles localStorage throwing errors gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Access denied');
      },
      setItem: () => {
        throw new Error('Access denied');
      },
    });

    expect(() => getInitialGfxQuality()).not.toThrow();

    useGfxSettings.getState().setQuality('low');
    expect(useGfxSettings.getState().quality).toBe('low');

    useGfxSettings.getState().toggleQuality();
    expect(useGfxSettings.getState().quality).toBe('high');
  });

  it('toggles between high and low and stores value in localStorage', () => {
    useGfxSettings.setState({ quality: 'high' });

    useGfxSettings.getState().toggleQuality();
    expect(useGfxSettings.getState().quality).toBe('low');
    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY_GFX_QUALITY, 'low');

    useGfxSettings.getState().toggleQuality();
    expect(useGfxSettings.getState().quality).toBe('high');
    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY_GFX_QUALITY, 'high');
  });
});
