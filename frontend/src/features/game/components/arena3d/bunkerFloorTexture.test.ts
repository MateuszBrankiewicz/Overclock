import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearBunkerTextureCacheForTests,
  getBunkerFloorTexture,
  getTableAoTexture,
} from './bunkerFloorTexture';

describe('bunkerFloorTexture (GFX-02)', () => {
  beforeEach(() => {
    clearBunkerTextureCacheForTests();
  });

  afterEach(() => {
    clearBunkerTextureCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null safely when document is undefined', () => {
    vi.stubGlobal('document', undefined);
    expect(getBunkerFloorTexture()).toBeNull();
    expect(getTableAoTexture()).toBeNull();
  });

  it('generates concrete floor texture with RepeatWrapping and returns cached instance', () => {
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      }),
    });

    const tex1 = getBunkerFloorTexture();
    expect(tex1).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex1?.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex1?.wrapT).toBe(THREE.RepeatWrapping);
    expect(tex1?.repeat.x).toBe(4);
    expect(tex1?.repeat.y).toBe(4);
    expect(mockCtx.fillRect).toHaveBeenCalled();

    // Calling again returns the cached instance without creating a second canvas
    const tex2 = getBunkerFloorTexture();
    expect(tex2).toBe(tex1);
  });

  it('generates table AO gradient texture and returns cached instance', () => {
    const mockGradient = {
      addColorStop: vi.fn(),
    };
    const mockCtx = {
      fillStyle: '',
      createRadialGradient: vi.fn(() => mockGradient),
      fillRect: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      }),
    });

    const ao1 = getTableAoTexture();
    expect(ao1).toBeInstanceOf(THREE.CanvasTexture);
    expect(mockCtx.createRadialGradient).toHaveBeenCalledWith(128, 128, 0, 128, 128, 128);
    expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, expect.any(String));

    const ao2 = getTableAoTexture();
    expect(ao2).toBe(ao1);
  });

  it('clears and disposes texture cache', () => {
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    });

    const tex = getBunkerFloorTexture();
    const ao = getTableAoTexture();
    const texDisposeSpy = vi.spyOn(tex!, 'dispose');
    const aoDisposeSpy = vi.spyOn(ao!, 'dispose');

    clearBunkerTextureCacheForTests();
    expect(texDisposeSpy).toHaveBeenCalled();
    expect(aoDisposeSpy).toHaveBeenCalled();

    // Next get creates a new instance
    const texNew = getBunkerFloorTexture();
    expect(texNew).not.toBe(tex);
  });
});
