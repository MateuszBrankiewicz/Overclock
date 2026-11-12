import { create } from 'zustand';

const STORAGE_KEY_MUTED = 'overclock_audio_muted';
const STORAGE_KEY_VOLUME = 'overclock_audio_volume';
const STORAGE_KEY_VOICE_ENABLED = 'overclock_voice_enabled';

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

function getInitialVoiceEnabled(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_VOICE_ENABLED);
      if (saved !== null) return saved === 'true';
    }
  } catch {
    // LocalStorage blocked
  }
  return true;
}

export interface AudioSettingsState {
  muted: boolean;
  volume: number;
  voiceEnabled: boolean;
  toggleMute: () => void;
  toggleVoice: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setVoiceEnabled: (enabled: boolean) => void;
}

export const useAudioSettings = create<AudioSettingsState>((set) => ({
  muted: getInitialMuted(),
  volume: getInitialVolume(),
  voiceEnabled: getInitialVoiceEnabled(),

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

      if (nextMuted) {
        void import('./robotVoice')
          .then(({ cancelAllSpeech }) => cancelAllSpeech())
          .catch(() => {});
      }

      return { muted: nextMuted };
    });
  },

  toggleVoice: () => {
    set((state) => {
      const nextEnabled = !state.voiceEnabled;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_VOICE_ENABLED, String(nextEnabled));
        }
      } catch {
        // Storage access blocked
      }

      if (!nextEnabled) {
        void import('./robotVoice')
          .then(({ cancelAllSpeech }) => cancelAllSpeech())
          .catch(() => {});
      }

      return { voiceEnabled: nextEnabled };
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

    if (muted) {
      void import('./robotVoice')
        .then(({ cancelAllSpeech }) => cancelAllSpeech())
        .catch(() => {});
    }

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

  setVoiceEnabled: (enabled) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_VOICE_ENABLED, String(enabled));
      }
    } catch {
      // Storage access blocked
    }

    if (!enabled) {
      void import('./robotVoice')
        .then(({ cancelAllSpeech }) => cancelAllSpeech())
        .catch(() => {});
    }

    set({ voiceEnabled: enabled });
  },
}));
