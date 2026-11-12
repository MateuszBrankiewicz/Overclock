import {
  playCardClick,
  playCardSelect,
  playDischarge,
  playEliminated,
  playExploitActivate,
  playRoundStart,
  playSurvived,
  playTraceSiren,
  playTurnTick,
  playVictory,
  playVoiceBlip,
  playVoltageBuzz,
  playYourTurn,
  startHum,
} from './effects';
import type { AudioEffectName, AudioEffectParams } from './types';

const STORAGE_KEY_MUTED = 'overclock_audio_muted';
const STORAGE_KEY_VOLUME = 'overclock_audio_volume';
const DEFAULT_VOLUME = 0.6;

function readStoredMuted(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY_MUTED);
      if (val !== null) return val === 'true';
    }
  } catch {
    // Storage access blocked / throwing
  }
  return false;
}

function readStoredVolume(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (val !== null) {
        const parsed = parseFloat(val);
        if (!Number.isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
      }
    }
  } catch {
    // Storage access blocked / throwing
  }
  return DEFAULT_VOLUME;
}

function persistMuted(muted: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    }
  } catch {
    // Storage access blocked / throwing
  }
}

function persistVolume(volume: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
    }
  } catch {
    // Storage access blocked / throwing
  }
}

const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUnlocked = false;
  private muted: boolean;
  private volume: number;
  private humHandle: { stop: () => void } | null = null;
  private humDesired = false;
  private gestureListenerRegistered = false;
  private boundGestureHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;

  constructor() {
    this.muted = readStoredMuted();
    this.volume = readStoredVolume();
    this.setupListeners();
  }

  private removeGestureListeners(): void {
    if (typeof window === 'undefined' || !this.boundGestureHandler) return;
    for (const evt of GESTURE_EVENTS) {
      try {
        window.removeEventListener(evt, this.boundGestureHandler, { capture: true });
      } catch {
        // Safe degradation
      }
    }
    this.boundGestureHandler = null;
    this.gestureListenerRegistered = false;
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    if (!this.gestureListenerRegistered) {
      this.boundGestureHandler = () => {
        this.unlock();
      };
      for (const evt of GESTURE_EVENTS) {
        try {
          window.addEventListener(evt, this.boundGestureHandler, { capture: true, passive: true });
        } catch {
          // Safe degradation in non-standard test environments
        }
      }
      this.gestureListenerRegistered = true;
    }

    if (typeof document !== 'undefined' && !this.boundVisibilityHandler) {
      this.boundVisibilityHandler = () => {
        if (!this.ctx) return;
        if (document.hidden) {
          if (this.ctx.state === 'running') {
            void this.ctx.suspend().catch(() => {});
          }
        } else if (this.isUnlocked && this.ctx.state === 'suspended') {
          void this.ctx.resume().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }

  public unlock(): void {
    this.isUnlocked = true;
    const ctx = this.getOrCreateContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            this.removeGestureListeners();
          }
          if (this.humDesired && !this.muted && !this.humHandle) {
            this.startHum();
          }
        })
        .catch(() => {});
    } else if (ctx && ctx.state === 'running') {
      this.removeGestureListeners();
      if (this.humDesired && !this.muted && !this.humHandle) {
        this.startHum();
      }
    } else if (this.humDesired && !this.muted && !this.humHandle) {
      this.startHum();
    }
  }

  public getOrCreateContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioCtxClass =
        (typeof window !== 'undefined' &&
          (window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) ||
        (typeof globalThis !== 'undefined' &&
          (globalThis.AudioContext ||
            (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) ||
        null;

      if (!AudioCtxClass) return null;

      const ctx = new AudioCtxClass();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
      gain.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = gain;
      return ctx;
    } catch {
      return null;
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  public isEngineUnlocked(): boolean {
    return this.isUnlocked;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    persistMuted(muted);

    if (this.masterGain && this.ctx) {
      try {
        const target = muted ? 0 : this.volume;
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
      } catch {
        this.masterGain.gain.value = muted ? 0 : this.volume;
      }
    }

    if (muted && this.humHandle) {
      this.stopHum(false);
    } else if (!muted && this.humDesired && !this.humHandle && this.isUnlocked) {
      this.startHum();
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volume = clamped;
    persistVolume(clamped);

    if (!this.muted && this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(clamped, this.ctx.currentTime + 0.05);
      } catch {
        this.masterGain.gain.value = clamped;
      }
    }
  }

  private executeEffect(name: AudioEffectName, params?: AudioEffectParams): void {
    const ctx = this.ctx;
    const gain = this.masterGain;
    if (!ctx || !gain) return;

    try {
      switch (name) {
        case 'cardClick':
          playCardClick(ctx, gain);
          break;
        case 'traceSiren':
          playTraceSiren(ctx, gain);
          break;
        case 'voltageBuzz':
          playVoltageBuzz(ctx, gain, params);
          break;
        case 'discharge':
          playDischarge(ctx, gain);
          break;
        case 'roundStart':
          playRoundStart(ctx, gain);
          break;
        case 'eliminated':
          playEliminated(ctx, gain);
          break;
        case 'voiceBlip':
          playVoiceBlip(ctx, gain, params);
          break;
        case 'cardSelect':
          playCardSelect(ctx, gain, params);
          break;
        case 'yourTurn':
          playYourTurn(ctx, gain);
          break;
        case 'turnTick':
          playTurnTick(ctx, gain, params);
          break;
        case 'exploitActivate':
          playExploitActivate(ctx, gain);
          break;
        case 'survived':
          playSurvived(ctx, gain);
          break;
        case 'victory':
          playVictory(ctx, gain);
          break;
      }
    } catch {
      // Audio node scheduling must never crash gameplay
    }
  }

  public play(name: AudioEffectName, params?: AudioEffectParams): void {
    // Autoplay compliance: Drop without throwing or queuing before unlock or when muted
    if (!this.isUnlocked || this.muted || this.volume <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const ctx = this.getOrCreateContext();
    if (!ctx || !this.masterGain || ctx.state === 'closed') return;

    if (ctx.state === 'running') {
      this.executeEffect(name, params);
      return;
    }

    if (ctx.state === 'suspended') {
      const requestedAt = Date.now();
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            this.removeGestureListeners();
          }
          if (
            Date.now() - requestedAt < 250 &&
            !this.muted &&
            this.volume > 0 &&
            this.ctx === ctx &&
            ctx.state === 'running'
          ) {
            this.executeEffect(name, params);
          }
        })
        .catch(() => {});
    }
  }

  public startHum(): void {
    this.humDesired = true;
    if (!this.isUnlocked || this.muted || this.humHandle) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const ctx = this.getOrCreateContext();
    if (!ctx || !this.masterGain || ctx.state === 'closed') return;

    if (ctx.state === 'running') {
      try {
        this.humHandle = startHum(ctx, this.masterGain);
      } catch {
        // Graceful fallback
      }
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            this.removeGestureListeners();
          }
          if (
            this.humDesired &&
            !this.muted &&
            !this.humHandle &&
            this.ctx === ctx &&
            ctx.state === 'running'
          ) {
            try {
              this.humHandle = startHum(ctx, this.masterGain!);
            } catch {
              // Graceful fallback
            }
          }
        })
        .catch(() => {});
    }
  }

  public stopHum(clearDesired = true): void {
    if (clearDesired) {
      this.humDesired = false;
    }
    if (this.humHandle) {
      try {
        this.humHandle.stop();
      } catch {
        // Safe cleanup
      }
      this.humHandle = null;
    }
  }

  /** Test helper to tear down listeners and reset state */
  public resetForTests(): void {
    this.stopHum();
    this.removeGestureListeners();
    if (this.boundVisibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (this.ctx) {
      try {
        void this.ctx.close().catch(() => {});
      } catch {
        // Safe context teardown in tests
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.isUnlocked = false;
    this.gestureListenerRegistered = false;
    this.boundGestureHandler = null;
    this.boundVisibilityHandler = null;
    this.muted = readStoredMuted();
    this.volume = readStoredVolume();
    this.setupListeners();
  }
}

export const audioEngine = new AudioEngine();
