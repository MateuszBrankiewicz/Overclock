import type { CharacterId } from '../../../features/game/utils/characterCatalog';
import { useI18n } from '../../i18n';
import { playSfx } from './playSfx';
import { useAudioSettings } from './useAudioSettings';
import { VOICE_PROFILES } from './voiceProfiles';

export interface SpeakOptions {
  priority?: 'normal' | 'high';
  sequenceNumber?: number;
}

interface QueuedUtterance {
  characterId: CharacterId;
  text: string;
  options?: SpeakOptions;
}

const queue: QueuedUtterance[] = [];
const processedSequenceNumbers = new Set<number>();
let isSpeaking = false;
let visibilityListenerRegistered = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearSafetyTimer(): void {
  if (speechSafetyTimer !== null) {
    clearTimeout(speechSafetyTimer);
    speechSafetyTimer = null;
  }
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
    return window.speechSynthesis;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'speechSynthesis' in globalThis &&
    (globalThis as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis
  ) {
    return (globalThis as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis;
  }
  return null;
}

function getUtteranceClass(): typeof SpeechSynthesisUtterance | null {
  if (typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window && window.SpeechSynthesisUtterance) {
    return window.SpeechSynthesisUtterance;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'SpeechSynthesisUtterance' in globalThis &&
    (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance
  ) {
    return (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance;
  }
  return null;
}

function setupVisibilityListener(): void {
  if (typeof document === 'undefined' || visibilityListenerRegistered) return;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAllSpeech();
    }
  });
  visibilityListenerRegistered = true;
}

export function cancelAllSpeech(): void {
  clearSafetyTimer();
  activeUtterance = null;
  queue.length = 0;
  isSpeaking = false;
  const synth = getSpeechSynthesis();
  if (synth) {
    try {
      synth.cancel();
    } catch {
      // Safe degradation
    }
  }
}

function processNext(): void {
  if (queue.length === 0) {
    isSpeaking = false;
    return;
  }

  const next = queue.shift();
  if (!next) {
    isSpeaking = false;
    return;
  }

  executeSpeech(next.characterId, next.text, next.options);
}

function selectSystemVoice(
  synth: SpeechSynthesis,
  languageCode: 'pl-PL' | 'en-US',
  preferredIndex = 0
): SpeechSynthesisVoice | null {
  try {
    const voices = synth.getVoices();
    if (!voices || voices.length === 0) return null;
    const prefix = languageCode.startsWith('pl') ? 'pl' : 'en';
    const matching = voices.filter((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(prefix)
    );
    if (matching.length === 0) return null;
    const index = Math.abs(preferredIndex) % matching.length;
    return matching[index];
  } catch {
    return null;
  }
}

function executeSpeech(
  characterId: CharacterId,
  text: string,
  _options?: SpeakOptions
): void {
  const synth = getSpeechSynthesis();
  if (!synth) {
    isSpeaking = false;
    return;
  }

  const settings = useAudioSettings.getState();
  if (settings.muted || !settings.voiceEnabled || settings.volume <= 0) {
    isSpeaking = false;
    return;
  }

  isSpeaking = true;
  const profile = VOICE_PROFILES[characterId] ?? VOICE_PROFILES.ghost;

  // Trigger procedural audio preamble blip via Web Audio engine
  try {
    playSfx('voiceBlip', { blip: profile.blip });
  } catch {
    // Non-blocking
  }

  try {
    const UtteranceClass = getUtteranceClass();
    if (!UtteranceClass) {
      isSpeaking = false;
      return;
    }

    const utterance = new UtteranceClass(text);
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
    utterance.volume = Math.max(0, Math.min(1, profile.volume * settings.volume));

    const currentLang = useI18n.getState().language;
    const langCode = currentLang === 'pl' ? 'pl-PL' : 'en-US';
    utterance.lang = langCode;

    const matchedVoice = selectSystemVoice(
      synth,
      langCode,
      profile.voiceHint?.preferredVoiceIndex ?? 0
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    activeUtterance = utterance;
    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      if (activeUtterance !== utterance) return;
      clearSafetyTimer();
      activeUtterance = null;
      isSpeaking = false;
      processNext();
    };

    utterance.onend = onFinish;
    utterance.onerror = onFinish;

    clearSafetyTimer();
    speechSafetyTimer = setTimeout(() => {
      if (!finished && activeUtterance === utterance) {
        onFinish();
      }
    }, 5000);

    try {
      if ((synth as unknown as { paused?: boolean }).paused) {
        (synth as unknown as { resume?: () => void }).resume?.();
      }
    } catch {
      // Safe degradation
    }

    synth.speak(utterance);
  } catch {
    clearSafetyTimer();
    activeUtterance = null;
    isSpeaking = false;
    processNext();
  }
}

export function speakRobotVoice(
  characterId: CharacterId,
  text: string,
  options?: SpeakOptions
): void {
  setupVisibilityListener();

  const synth = getSpeechSynthesis();
  if (!synth) {
    return;
  }

  const settings = useAudioSettings.getState();
  if (settings.muted || !settings.voiceEnabled || settings.volume <= 0) {
    return;
  }

  // Deduplicate by SignalR event sequence number
  if (options?.sequenceNumber !== undefined) {
    if (processedSequenceNumbers.has(options.sequenceNumber)) {
      return;
    }
    processedSequenceNumbers.add(options.sequenceNumber);
    if (processedSequenceNumbers.size > 100) {
      const first = processedSequenceNumbers.values().next().value;
      if (first !== undefined) processedSequenceNumbers.delete(first);
    }
  }

  if (options?.priority === 'high') {
    // High-priority interruption (e.g. "LIAR!" / "KŁAMCA!")
    cancelAllSpeech();
    executeSpeech(characterId, text, options);
    return;
  }

  if (isSpeaking) {
    // Cap queue length to 2 items to avoid stale speech backlog
    if (queue.length >= 2) {
      queue.shift();
    }
    queue.push({ characterId, text, options });
    return;
  }

  executeSpeech(characterId, text, options);
}

/** Pre-warms system speech synthesis voice list on user interaction */
export function warmupSpeechSynthesis(): void {
  const synth = getSpeechSynthesis();
  try {
    synth?.getVoices?.();
  } catch {
    // Safe degradation
  }
}

/** Resets all internal robot voice state for Vitest isolated runs. */
export function __resetRobotVoiceForTests(): void {
  clearSafetyTimer();
  activeUtterance = null;
  queue.length = 0;
  processedSequenceNumbers.clear();
  isSpeaking = false;
}
