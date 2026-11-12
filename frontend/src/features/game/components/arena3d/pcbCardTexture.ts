import * as THREE from 'three';

import type { CardProtocol } from '../../schemas/gameEvents';
import { generatePcbTraces } from '../../utils/pcbTraceGenerator';

const PROTOCOL_STYLE: Record<
  CardProtocol,
  {
    label: string;
    token: string;
    bgTop: string;
    bgBottom: string;
    trace: string;
    border: string;
    text: string;
  }
> = {
  Alpha: {
    label: 'ALPHA',
    token: '[A]',
    bgTop: '#022c22',
    bgBottom: '#051814',
    trace: '#f59e0b',
    border: '#10b981',
    text: '#6ee7b7',
  },
  Beta: {
    label: 'BETA',
    token: '[B]',
    bgTop: '#451a03',
    bgBottom: '#1c0a00',
    trace: '#f97316',
    border: '#f59e0b',
    text: '#fcd34d',
  },
  Gamma: {
    label: 'GAMMA',
    token: '[G]',
    bgTop: '#083344',
    bgBottom: '#041821',
    trace: '#38bdf8',
    border: '#06b6d4',
    text: '#67e8f9',
  },
  Glitch: {
    label: 'OVERRIDE',
    token: '[!]',
    bgTop: '#3b0764',
    bgBottom: '#1a032e',
    trace: '#e879f9',
    border: '#d946ef',
    text: '#f5d0fe',
  },
  Corrupted: {
    label: 'CORRUPTED',
    token: '[X]',
    bgTop: '#3f0d12',
    bgBottom: '#140406',
    trace: '#ef4444',
    border: '#dc2626',
    text: '#fca5a5',
  },
};

const textureCache = new Map<string, THREE.CanvasTexture>();

export interface PcbCardFrontLabels {
  ready: string;
  selectHint: string;
}

export function createPcbCardTexture(
  protocol: CardProtocol,
  visualSeed = 0,
  badge: 'match' | 'wild' | 'bluff' | null = null,
  selected = false,
  labels: PcbCardFrontLabels
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cacheKey = `${protocol}:${visualSeed}:${badge ?? 'none'}:${selected ? '1' : '0'}:${labels.ready}:${labels.selectHint}`;
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const style = PROTOCOL_STYLE[protocol];
  const traces = generatePcbTraces(visualSeed);

  // 1. Substrate gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, style.bgTop);
  grad.addColorStop(1, style.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 720);

  // 2. Subtle circuit grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let x = 32; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 720);
    ctx.stroke();
  }
  for (let y = 32; y < 720; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // 3. Outer PCB border & Gold contacts
  ctx.strokeStyle = selected ? '#34d399' : style.border;
  ctx.lineWidth = selected ? 14 : 8;
  ctx.strokeRect(14, 14, 484, 692);

  // Gold edge connector pins at bottom
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(56 + i * 42, 680, 22, 24);
  }

  // 4. Procedural PCB traces scaled from 100x140 to 512x720
  const scaleX = 5.12;
  const scaleY = 5.14;
  ctx.strokeStyle = style.trace;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';

  traces.lines.forEach((l) => {
    ctx.beginPath();
    ctx.moveTo(l.x1 * scaleX, l.y1 * scaleY);
    ctx.lineTo(l.x2 * scaleX, l.y2 * scaleY);
    ctx.stroke();
  });

  traces.vias.forEach((v) => {
    ctx.beginPath();
    ctx.arc(v.cx * scaleX, v.cy * scaleY, v.r * 5, 0, Math.PI * 2);
    ctx.fillStyle = style.trace;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
  });

  // 5. Top Header Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(28, 28, 456, 84);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, 456, 84);

  ctx.fillStyle = style.text;
  ctx.font = '900 52px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.token, 46, 72);

  if (badge) {
    const badgeLabel = badge === 'match' ? 'ZGODNA' : badge === 'wild' ? 'JOKER' : 'BLEF';
    const badgeColor =
      badge === 'match' ? '#10b981' : badge === 'wild' ? '#e879f9' : '#f59e0b';
    ctx.fillStyle = badgeColor;
    ctx.fillRect(300, 44, 166, 52);
    ctx.fillStyle = '#000000';
    ctx.font = '900 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(badgeLabel, 383, 72);
    ctx.textAlign = 'left';
  }

  // 6. Central Microcontroller Silicon Die
  ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
  ctx.fillRect(76, 265, 360, 175);
  ctx.strokeStyle = style.trace;
  ctx.lineWidth = 5;
  ctx.strokeRect(76, 265, 360, 175);

  // IC legs around center chip
  ctx.fillStyle = '#a1a1aa';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(105 + i * 54, 245, 16, 20);
    ctx.fillRect(105 + i * 54, 440, 16, 20);
  }

  ctx.fillStyle = style.text;
  ctx.font = '900 58px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(style.label, 256, 340);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`BUS // ${protocol.toUpperCase()}`, 256, 398);

  // 7. Bottom Telemetry Strip
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(28, 595, 456, 68);
  ctx.fillStyle = style.text;
  ctx.font = 'bold 30px monospace';
  ctx.fillText(selected ? labels.ready : labels.selectHint, 256, 631);
  ctx.textAlign = 'left';

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

const backTextureCache = new Map<string, THREE.CanvasTexture>();

export function createPcbCardBackTexture(caption: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const cachedBack = backTextureCache.get(caption);
  if (cachedBack) {
    return cachedBack;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 720);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, 476, 684);

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 360, 140, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = '900 40px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DEAD CIRCUIT', 256, 345);
  ctx.fillStyle = '#71717a';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(caption, 256, 395);

  const backTexture = new THREE.CanvasTexture(canvas);
  backTexture.needsUpdate = true;
  backTextureCache.set(caption, backTexture);
  return backTexture;
}
