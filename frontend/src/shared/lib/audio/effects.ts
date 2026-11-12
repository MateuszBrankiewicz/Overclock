import type { AudioEffectParams } from './types';

export function playCardClick(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.035);
}

export function playTraceSiren(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(880, now + 0.2);
  osc.frequency.linearRampToValueAtTime(440, now + 0.4);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
  gain.gain.setValueAtTime(0.22, now + 0.35);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.46);
}

export function computeVoltageBuzzFrequency(riskLevel: number): number {
  const safeRisk = Math.max(1, Math.min(6, riskLevel));
  return 65 + safeRisk * 28;
}

export function playVoltageBuzz(
  ctx: AudioContext,
  destination: AudioNode,
  params?: AudioEffectParams
): void {
  const safeRisk = Math.max(1, Math.min(6, params?.riskLevel ?? 1));
  const baseFreq = computeVoltageBuzzFrequency(safeRisk);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(baseFreq, now);

  subOsc.type = 'square';
  subOsc.frequency.setValueAtTime(baseFreq / 2, now);

  const peak = Math.min(0.35, 0.18 + safeRisk * 0.025);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.02);
  gain.gain.setValueAtTime(peak, now + 0.26);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.32);

  osc.connect(gain);
  subOsc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  subOsc.start(now);
  osc.stop(now + 0.33);
  subOsc.stop(now + 0.33);
}

export function playDischarge(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;

  // 1. Procedural noise burst (dielectric snap)
  try {
    const sampleRate = ctx.sampleRate || 44100;
    const bufferSize = Math.floor(sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.3));
      channel[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(now);
  } catch {
    // Graceful fallback if buffer creation fails in tests or legacy platforms
  }

  // 2. Sub-bass pop
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();

  sub.type = 'sine';
  sub.frequency.setValueAtTime(140, now);
  sub.frequency.exponentialRampToValueAtTime(42, now + 0.25);

  subGain.gain.setValueAtTime(0.35, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  sub.connect(subGain);
  subGain.connect(destination);
  sub.start(now);
  sub.stop(now + 0.26);
}

export function playRoundStart(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const triad = [523.25, 659.25, 783.99]; // C5, E5, G5

  triad.forEach((freq, idx) => {
    const start = now + idx * 0.065;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(start);
    osc.stop(start + 0.065);
  });
}

export function playEliminated(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.52);
}

export function startHum(
  ctx: AudioContext,
  destination: AudioNode
): { stop: () => void } {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, now); // A1 sub-frequency

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);

  return {
    stop: () => {
      try {
        const stopTime = ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, stopTime);
        gain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.2);
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
          } catch {
            // Safe cleanup
          }
        }, 220);
      } catch {
        // Safe cleanup
      }
    },
  };
}
