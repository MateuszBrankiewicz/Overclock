import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioEngine,audioEngine } from './audioEngine';
import { computeTurnTickFrequency, computeVoltageBuzzFrequency } from './effects';

// Fake Web Audio API implementations for JSDOM / Vitest
class FakeAudioParam {
  public value: number;
  public setValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
  public linearRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
  public exponentialRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });

  constructor(defaultValue = 1) {
    this.value = defaultValue;
  }
}

class FakeAudioNode {
  public connect = vi.fn((_dest: unknown) => undefined);
  public disconnect = vi.fn(() => undefined);
}

class FakeGainNode extends FakeAudioNode {
  public gain = new FakeAudioParam(1);
}

class FakeOscillatorNode extends FakeAudioNode {
  public frequency = new FakeAudioParam(440);
  public type: OscillatorType = 'sine';
  public start = vi.fn((_time?: number) => undefined);
  public stop = vi.fn((_time?: number) => undefined);
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  public buffer: unknown = null;
  public start = vi.fn((_time?: number) => undefined);
  public stop = vi.fn((_time?: number) => undefined);
}

class FakeAudioBuffer {
  public length: number;
  public sampleRate: number;
  private channelData: Float32Array;

  constructor(_numberOfChannels: number, length: number, sampleRate: number) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = new Float32Array(length);
  }

  public getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class FakeAudioContext {
  public state: AudioContextState = 'suspended';
  public currentTime = 10;
  public sampleRate = 44100;
  public destination = new FakeAudioNode();

  public resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  public suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });

  public close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });

  public createGain = vi.fn(() => new FakeGainNode());
  public createOscillator = vi.fn(() => new FakeOscillatorNode());
  public createBufferSource = vi.fn(() => new FakeAudioBufferSourceNode());
  public createBuffer = vi.fn(
    (channels: number, length: number, sampleRate: number) =>
      new FakeAudioBuffer(channels, length, sampleRate)
  );
}

class MockEventTarget {
  private listeners: Record<string, ((ev: unknown) => void)[]> = {};

  public addEventListener(
    type: string,
    listener: (ev: unknown) => void,
    options?: { once?: boolean }
  ) {
    if (!this.listeners[type]) this.listeners[type] = [];
    const fn = options?.once
      ? (ev: unknown) => {
          this.removeEventListener(type, fn);
          listener(ev);
        }
      : listener;
    this.listeners[type].push(fn);
  }

  public removeEventListener(type: string, listener: (ev: unknown) => void) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  public dispatchEvent(event: { type: string }) {
    const list = this.listeners[event.type] ? [...this.listeners[event.type]] : [];
    for (const fn of list) {
      fn(event);
    }
    return true;
  }
}

describe('Web Audio Engine (ADR 0014)', () => {
  let fakeCtx: FakeAudioContext;
  let memoryStorage: ReturnType<typeof createMemoryStorage>;
  let mockWindow: MockEventTarget & { AudioContext?: unknown };
  let mockDocument: MockEventTarget & { hidden: boolean };

  function createMemoryStorage() {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };
  }

  beforeEach(() => {
    fakeCtx = new FakeAudioContext();
    const MockAudioContext = vi.fn(function () {
      return fakeCtx;
    });
    vi.stubGlobal('AudioContext', MockAudioContext);
    memoryStorage = createMemoryStorage();
    vi.stubGlobal('localStorage', memoryStorage);

    mockWindow = Object.assign(new MockEventTarget(), {
      AudioContext: MockAudioContext,
    });
    vi.stubGlobal('window', mockWindow);

    mockDocument = Object.assign(new MockEventTarget(), {
      hidden: false,
    });
    vi.stubGlobal('document', mockDocument);

    audioEngine.resetForTests();
  });

  afterEach(() => {
    audioEngine.resetForTests();
    vi.unstubAllGlobals();
  });

  it('drops play calls as silent no-ops before gesture unlock', () => {
    expect(audioEngine.isEngineUnlocked()).toBe(false);

    audioEngine.play('cardClick');

    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
    expect(audioEngine.isEngineUnlocked()).toBe(false);
  });

  it('unlocks and calls ctx.resume on pointerdown gesture', () => {
    expect(audioEngine.isEngineUnlocked()).toBe(false);

    mockWindow.dispatchEvent({ type: 'pointerdown' });

    expect(audioEngine.isEngineUnlocked()).toBe(true);
    expect(fakeCtx.resume).toHaveBeenCalled();
  });

  it('unlocks and calls ctx.resume on keydown gesture', () => {
    expect(audioEngine.isEngineUnlocked()).toBe(false);

    mockWindow.dispatchEvent({ type: 'keydown' });

    expect(audioEngine.isEngineUnlocked()).toBe(true);
    expect(fakeCtx.resume).toHaveBeenCalled();
  });

  it('plays synthesized cardClick effect after unlock', () => {
    audioEngine.unlock();
    fakeCtx.state = 'running';

    audioEngine.play('cardClick');

    expect(fakeCtx.createOscillator).toHaveBeenCalled();
    expect(fakeCtx.createGain).toHaveBeenCalled();
  });

  it('resumes suspended context on play after unlock and executes effect once running', async () => {
    audioEngine.unlock();
    fakeCtx.state = 'suspended';

    audioEngine.play('cardClick');

    expect(fakeCtx.resume).toHaveBeenCalled();
    await Promise.resolve();
    expect(fakeCtx.createOscillator).toHaveBeenCalled();
  });

  it('does not play audio when tab document is hidden', () => {
    audioEngine.unlock();
    fakeCtx.state = 'running';
    mockDocument.hidden = true;

    audioEngine.play('cardClick');

    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('voltageBuzz frequency scales monotonically with riskLevel', () => {
    const f1 = computeVoltageBuzzFrequency(1);
    const f3 = computeVoltageBuzzFrequency(3);
    const f6 = computeVoltageBuzzFrequency(6);

    expect(f6).toBeGreaterThan(f3);
    expect(f3).toBeGreaterThan(f1);
  });

  it('turnTick frequency rises monotonically as secondsLeft decreases (UX-03)', () => {
    const f5 = computeTurnTickFrequency(5);
    const f3 = computeTurnTickFrequency(3);
    const f1 = computeTurnTickFrequency(1);

    expect(f1).toBeGreaterThan(f3);
    expect(f3).toBeGreaterThan(f5);
  });

  it('constructs audio graphs for all UX-03 game sfx without throwing', () => {
    audioEngine.unlock();
    fakeCtx.state = 'running';

    expect(() => {
      audioEngine.play('cardSelect', { selected: true });
      audioEngine.play('cardSelect', { selected: false });
      audioEngine.play('yourTurn');
      audioEngine.play('turnTick', { secondsLeft: 3 });
      audioEngine.play('exploitActivate');
      audioEngine.play('survived');
      audioEngine.play('victory');
    }).not.toThrow();
  });

  it('sets muted state, ramps master gain to 0, and persists to localStorage', () => {
    audioEngine.unlock();
    audioEngine.getOrCreateContext();

    audioEngine.setMuted(true);

    expect(audioEngine.isMuted()).toBe(true);
    expect(localStorage.getItem('overclock_audio_muted')).toBe('true');
    expect(audioEngine.getMasterGain()?.gain.value).toBe(0);

    audioEngine.setMuted(false);
    expect(audioEngine.isMuted()).toBe(false);
    expect(localStorage.getItem('overclock_audio_muted')).toBe('false');
    expect(audioEngine.getMasterGain()?.gain.value).toBe(0.6);
  });

  it('sets volume, clamps between 0 and 1, and persists', () => {
    audioEngine.unlock();
    audioEngine.getOrCreateContext();

    audioEngine.setVolume(1.5);
    expect(audioEngine.getVolume()).toBe(1);

    audioEngine.setVolume(-0.2);
    expect(audioEngine.getVolume()).toBe(0);

    audioEngine.setVolume(0.75);
    expect(audioEngine.getVolume()).toBe(0.75);
    expect(localStorage.getItem('overclock_audio_volume')).toBe('0.75');
  });

  it('gracefully tolerates localStorage exceptions without breaking engine', () => {
    const brokenStorage = {
      getItem: vi.fn(() => {
        throw new Error('Access denied');
      }),
      setItem: vi.fn(() => {
        throw new Error('Quota exceeded');
      }),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal('localStorage', brokenStorage);

    const testEngine = new AudioEngine();
    expect(testEngine.isMuted()).toBe(false);
    expect(testEngine.getVolume()).toBe(0.6);

    expect(() => testEngine.setMuted(true)).not.toThrow();
    expect(testEngine.isMuted()).toBe(true);

    expect(() => testEngine.setVolume(0.5)).not.toThrow();
    expect(testEngine.getVolume()).toBe(0.5);
  });

  it('suspends on visibilitychange hidden and resumes when returning', () => {
    audioEngine.unlock();
    fakeCtx.state = 'running';

    // Simulate tab hiding
    mockDocument.hidden = true;
    mockDocument.dispatchEvent({ type: 'visibilitychange' });
    expect(fakeCtx.suspend).toHaveBeenCalled();

    // Simulate tab returning
    mockDocument.hidden = false;
    mockDocument.dispatchEvent({ type: 'visibilitychange' });
    expect(fakeCtx.resume).toHaveBeenCalled();
  });

  it('gracefully degrades to no-op when AudioContext is completely absent', () => {
    vi.stubGlobal('AudioContext', undefined);
    const noAudioEngine = new AudioEngine();

    expect(() => noAudioEngine.unlock()).not.toThrow();
    expect(() => noAudioEngine.play('cardClick')).not.toThrow();
    expect(() => noAudioEngine.startHum()).not.toThrow();
    expect(() => noAudioEngine.stopHum()).not.toThrow();
  });

  it('enforces ADR 0014 invariant: zero audio asset files (.mp3, .ogg, .wav)', () => {
    const frontendDir = path.resolve(__dirname, '../../../../');
    const audioExts = ['.mp3', '.ogg', '.wav', '.flac', '.m4a'];

    function scanFiles(dir: string): string[] {
      const found: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          found.push(...scanFiles(fullPath));
        } else if (audioExts.some((ext) => entry.name.endsWith(ext))) {
          found.push(fullPath);
        }
      }
      return found;
    }

    const audioFiles = scanFiles(frontendDir);
    expect(audioFiles).toEqual([]);
  });

  it('enforces ADR 0014 invariant: no howler or tone dependencies in package.json', () => {
    const pkgPath = path.resolve(__dirname, '../../../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps['howler']).toBeUndefined();
    expect(deps['@types/howler']).toBeUndefined();
    expect(deps['tone']).toBeUndefined();
  });
});
