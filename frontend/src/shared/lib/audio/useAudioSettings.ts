import { create } from 'zustand';

const STORAGE_KEY_MUTED = 'overclock_audio_muted';
const STORAGE_KEY_VOLUME = 'overclock_audio_volume';

function getInitialMuted(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_MUTED);
      if (saved !== null) return saved === 'true';
    }
  } catch {
    // LocalStorage blocked
  }
  return false;
}

function getInitialVolume(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!Number.isNaN(val)) return Math.max(0, Math.min(1, val));
      }
    }
  } catch {
    // LocalStorage blocked
  }
  return 0.6;
}

export interface AudioSettingsState {
  muted: boolean;
  volume: number;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useAudioSettings = create<AudioSettingsState>((set) => ({
  muted: getInitialMuted(),
  volume: getInitialVolume(),

  toggleMute: () => {
    set((state) => {
      const nextMuted = !state.muted;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_MUTED, String(nextMuted));
        }
      } catch {
        // Storage access blocked
      }

      void import('./audioEngine')
        .then(({ audioEngine }) => {
          audioEngine.setMuted(nextMuted);
        })
        .catch(() => {});

      return { muted: nextMuted };
    });
  },

  setMuted: (muted) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      }
    } catch {
      // Storage access blocked
    }

    void import('./audioEngine')
      .then(({ audioEngine }) => {
        audioEngine.setMuted(muted);
      })
      .catch(() => {});

    set({ muted });
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
      }
    } catch {
      // Storage access blocked
    }

    void import('./audioEngine')
      .then(({ audioEngine }) => {
        audioEngine.setVolume(clamped);
      })
      .catch(() => {});

    set({ volume: clamped });
  },
}));
