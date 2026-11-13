import { create } from 'zustand';

export type GfxQuality = 'low' | 'high';

export const STORAGE_KEY_GFX_QUALITY = 'overclock_gfx_quality';

export function getInitialGfxQuality(): GfxQuality {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_GFX_QUALITY);
      if (saved === 'low' || saved === 'high') {
        return saved;
      }
    }
  } catch {
    // LocalStorage access blocked
  }

  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return 'low';
      }
      if (window.matchMedia('(pointer: coarse)').matches) {
        return 'low';
      }
    }
  } catch {
    // Media query matchMedia blocked
  }

  return 'high';
}

export interface GfxSettingsState {
  quality: GfxQuality;
  setQuality: (quality: GfxQuality) => void;
  toggleQuality: () => void;
}

export const useGfxSettings = create<GfxSettingsState>((set) => ({
  quality: getInitialGfxQuality(),

  setQuality: (quality) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_GFX_QUALITY, quality);
      }
    } catch {
      // LocalStorage access blocked
    }
    set({ quality });
  },

  toggleQuality: () => {
    set((state) => {
      const nextQuality: GfxQuality = state.quality === 'high' ? 'low' : 'high';
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_GFX_QUALITY, nextQuality);
        }
      } catch {
        // LocalStorage access blocked
      }
      return { quality: nextQuality };
    });
  },
}));
