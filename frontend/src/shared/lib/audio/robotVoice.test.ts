import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import characterCatalogJson from '../../../../../tests/contracts/signalr/CharacterCatalog.json';
import { translations } from '../../i18n';
import { playSfx } from './playSfx';
import {
  __resetRobotVoiceForTests,
  speakRobotVoice,
} from './robotVoice';
import { useAudioSettings } from './useAudioSettings';
import { VOICE_PROFILES } from './voiceProfiles';

vi.mock('./playSfx', () => ({
  playSfx: vi.fn(),
  setGameAudioHum: vi.fn(),
}));

class FakeSpeechSynthesisUtterance {
  public text: string;
  public pitch = 1;
  public rate = 1;
  public volume = 1;
  public lang = 'en-US';
  public voice: unknown = null;
  public onend: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class FakeSpeechSynthesis {
  public spoken: FakeSpeechSynthesisUtterance[] = [];
  public cancelCount = 0;
  public voices: Array<{ lang: string; name: string }> = [
    { lang: 'pl-PL', name: 'Polski Głos 1' },
    { lang: 'pl-PL', name: 'Polski Głos 2' },
    { lang: 'en-US', name: 'English Voice 1' },
    { lang: 'en-US', name: 'English Voice 2' },
  ];

  public speak(utt: FakeSpeechSynthesisUtterance): void {
    this.spoken.push(utt);
  }

  public cancel(): void {
    this.cancelCount++;
  }

  public getVoices(): Array<{ lang: string; name: string }> {
    return this.voices;
  }
}

class MockEventTarget {
  private listeners: Record<string, Array<(ev: unknown) => void>> = {};

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

function findAudioFiles(dir: string): string[] {
  const found: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        found.push(...findAudioFiles(full));
      } else if (/\.(mp3|ogg|wav|m4a|aac)$/i.test(entry)) {
        found.push(full);
      }
    }
  } catch {
    // Directory may not exist
  }
  return found;
}

describe('Robot Voice System (ADR 0016)', () => {
  let fakeSynth: FakeSpeechSynthesis;
  let mockWindow: MockEventTarget & {
    speechSynthesis?: unknown;
    SpeechSynthesisUtterance?: unknown;
  };
  let mockDocument: MockEventTarget & { hidden: boolean };

  beforeEach(() => {
    fakeSynth = new FakeSpeechSynthesis();
    mockWindow = Object.assign(new MockEventTarget(), {
      speechSynthesis: fakeSynth,
      SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
    });
    mockDocument = Object.assign(new MockEventTarget(), {
      hidden: false,
    });

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('speechSynthesis', fakeSynth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance);

    __resetRobotVoiceForTests();
    useAudioSettings.setState({ muted: false, volume: 0.8, voiceEnabled: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    __resetRobotVoiceForTests();
    vi.unstubAllGlobals();
  });

  it('enforces 0 KB audio files in frontend codebase (ADR 0014 / 0016 zero asset rule)', () => {
    const publicAudio = findAudioFiles(join(process.cwd(), 'frontend', 'public'));
    const srcAudio = findAudioFiles(join(process.cwd(), 'frontend', 'src'));
    expect(publicAudio).toEqual([]);
    expect(srcAudio).toEqual([]);
  });

  it('provides a voice profile matching every character in CharacterCatalog.json', () => {
    const catalogIds = characterCatalogJson;
    expect(catalogIds.length).toBeGreaterThan(0);
    for (const charId of catalogIds) {
      expect(VOICE_PROFILES).toHaveProperty(charId);
      const profile = VOICE_PROFILES[charId as keyof typeof VOICE_PROFILES];
      expect(profile).toBeDefined();
      expect(profile.pitch).toBeGreaterThan(0);
      expect(profile.rate).toBeGreaterThan(0);
      expect(profile.volume).toBeGreaterThan(0);
      expect(['lowSweep', 'zap', 'modem', 'glitch']).toContain(profile.blip);
    }
  });

  it('differentiates characters by pitch, rate, and audio preamble blip', () => {
    expect(VOICE_PROFILES.ghost.pitch).toBeLessThan(VOICE_PROFILES.volt.pitch);
    expect(VOICE_PROFILES.volt.rate).toBeGreaterThan(VOICE_PROFILES.ghost.rate);
    expect(VOICE_PROFILES.ghost.blip).toBe('lowSweep');
    expect(VOICE_PROFILES.volt.blip).toBe('zap');
    expect(VOICE_PROFILES.proxy.blip).toBe('modem');
    expect(VOICE_PROFILES.null.blip).toBe('glitch');
  });

  it('speaks line with character pitch and rate, triggering Web Audio preamble blip', () => {
    speakRobotVoice('volt', 'Trzy beta');

    expect(playSfx).toHaveBeenCalledWith('voiceBlip', { blip: 'zap' });
    expect(fakeSynth.spoken).toHaveLength(1);
    const utt = fakeSynth.spoken[0];
    expect(utt.text).toBe('Trzy beta');
    expect(utt.pitch).toBe(VOICE_PROFILES.volt.pitch);
    expect(utt.rate).toBe(VOICE_PROFILES.volt.rate);
    expect(utt.volume).toBeCloseTo(VOICE_PROFILES.volt.volume * 0.8);
  });

  it('cancels active speech when a high-priority line arrives (e.g. LIAR!)', () => {
    speakRobotVoice('ghost', 'Jedna alfa');
    expect(fakeSynth.spoken).toHaveLength(1);

    speakRobotVoice('volt', 'KŁAMCA!', { priority: 'high' });
    expect(fakeSynth.cancelCount).toBe(1);
    expect(fakeSynth.spoken).toHaveLength(2);
    expect(fakeSynth.spoken[1].text).toBe('KŁAMCA!');
    expect(fakeSynth.spoken[1].pitch).toBe(VOICE_PROFILES.volt.pitch);
  });

  it('deduplicates lines sharing the same SignalR sequenceNumber', () => {
    speakRobotVoice('proxy', 'Dwie gamma', { sequenceNumber: 101 });
    expect(fakeSynth.spoken).toHaveLength(1);

    speakRobotVoice('proxy', 'Dwie gamma', { sequenceNumber: 101 });
    expect(fakeSynth.spoken).toHaveLength(1);
  });

  it('drops speech when audio is muted or voice is disabled', () => {
    useAudioSettings.setState({ muted: true });
    speakRobotVoice('null', 'Dwa glitche');
    expect(fakeSynth.spoken).toHaveLength(0);

    useAudioSettings.setState({ muted: false, voiceEnabled: false });
    speakRobotVoice('null', 'Dwa glitche');
    expect(fakeSynth.spoken).toHaveLength(0);
  });

  it('cancels speech immediately when audio is muted in settings', async () => {
    speakRobotVoice('proxy', 'Rozpoczynam transmisję');
    expect(fakeSynth.spoken).toHaveLength(1);

    useAudioSettings.getState().setMuted(true);
    await new Promise((r) => setTimeout(r, 15));
    expect(fakeSynth.cancelCount).toBeGreaterThanOrEqual(1);
  });

  it('degrades gracefully when window.speechSynthesis is missing', () => {
    mockWindow.speechSynthesis = undefined;
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => {
      speakRobotVoice('ghost', 'Jedna alfa');
    }).not.toThrow();
  });

  it('correctly localizes card play declarations and liar shout in Polish and English', () => {
    const pl = translations.pl.voice;
    const en = translations.en.voice;

    expect(pl.playCards(1, 'Alpha')).toBe('jedna alfa');
    expect(pl.playCards(2, 'Beta')).toBe('dwie bety');
    expect(pl.playCards(3, 'Beta')).toBe('trzy bety');
    expect(pl.playCards(1, 'Glitch')).toBe('jeden glitch');
    expect(pl.liar).toBe('KŁAMCA!');

    expect(en.playCards(1, 'Alpha')).toBe('one alpha');
    expect(en.playCards(3, 'Beta')).toBe('three beta');
    expect(en.liar).toBe('LIAR!');
  });
});
