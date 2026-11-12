import type { AudioEffectName, AudioEffectParams } from './types';

let engineModulePromise: Promise<typeof import('./audioEngine')> | null = null;

function loadAudioEngine(): Promise<typeof import('./audioEngine')> {
  if (!engineModulePromise) {
    engineModulePromise = import('./audioEngine');
  }
  return engineModulePromise;
}

const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;
let earlyUnlockHandler: (() => void) | null = null;

function removeEarlyGestureListeners(): void {
  if (
    typeof window === 'undefined' ||
    typeof window.removeEventListener !== 'function' ||
    !earlyUnlockHandler
  ) {
    return;
  }
  for (const evt of GESTURE_EVENTS) {
    try {
      window.removeEventListener(evt, earlyUnlockHandler, { capture: true });
    } catch {
      // Safe degradation
    }
  }
  earlyUnlockHandler = null;
}

// Early browser-activation unlock: listen to the first user gesture anywhere on the window
// so that audio context is already warm and running before SignalR broadcasts arrive.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  earlyUnlockHandler = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis?.getVoices?.();
      }
    } catch {
      // Safe degradation
    }
    loadAudioEngine()
      .then(({ audioEngine }) => {
        audioEngine.unlock();
        if (audioEngine.isEngineUnlocked()) {
          removeEarlyGestureListeners();
        }
      })
      .catch(() => {});
  };
  for (const evt of GESTURE_EVENTS) {
    try {
      window.addEventListener(evt, earlyUnlockHandler, { capture: true, passive: true });
    } catch {
      // Safe degradation in non-standard test environments
    }
  }
}

export function playSfx(name: AudioEffectName, params?: AudioEffectParams): void {
  loadAudioEngine()
    .then(({ audioEngine }) => {
      audioEngine.play(name, params);
    })
    .catch(() => {
      // Dynamic import or synthesis error is a silent no-op
    });
}

export function setGameAudioHum(enabled: boolean): void {
  loadAudioEngine()
    .then(({ audioEngine }) => {
      if (enabled) {
        audioEngine.startHum();
      } else {
        audioEngine.stopHum();
      }
    })
    .catch(() => {
      // Silent no-op
    });
}
