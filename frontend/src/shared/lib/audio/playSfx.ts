import type { AudioEffectName, AudioEffectParams } from './types';

let engineModulePromise: Promise<typeof import('./audioEngine')> | null = null;

function loadAudioEngine(): Promise<typeof import('./audioEngine')> {
  if (!engineModulePromise) {
    engineModulePromise = import('./audioEngine');
  }
  return engineModulePromise;
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
