import * as THREE from 'three';

import type { CharacterProfile } from '../../utils/characterCatalog';

const visorTextureCache = new Map<string, THREE.CanvasTexture>();

export function createOperatorVisorTexture(
  character: CharacterProfile,
  isEliminated: boolean,
  isPendingVoltage: boolean,
  isActiveTurn: boolean
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const key = `${character.id}:${isEliminated ? 'dead' : 'alive'}:${
    isPendingVoltage ? 'volt' : 'norm'
  }:${isActiveTurn ? 'turn' : 'idle'}`;
  const cached = visorTextureCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const mainColor = isEliminated
    ? '#52525b'
    : isPendingVoltage
    ? '#ef4444'
    : character.primaryColor;
  const subColor = isEliminated ? '#27272a' : character.secondaryColor;

  // Dark glass visor background
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < 256; y += 6) {
    ctx.fillRect(0, y, 512, 2);
  }

  // Visor outer frame
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);

  if (isEliminated) {
    // Eliminated X _ X flatline visor
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(110, 80);
    ctx.lineTo(190, 160);
    ctx.moveTo(190, 80);
    ctx.lineTo(110, 160);
    ctx.moveTo(322, 80);
    ctx.lineTo(402, 160);
    ctx.moveTo(402, 80);
    ctx.lineTo(322, 160);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIGNAL LOST // BLACKOUT', 256, 218);
  } else if (character.visorStyle === 'matrix') {
    // GHOST-01 fierce cybernetic angular LED eyes
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(85, 95);
    ctx.lineTo(215, 115);
    ctx.lineTo(195, 155);
    ctx.lineTo(95, 140);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(427, 95);
    ctx.lineTo(297, 115);
    ctx.lineTo(317, 155);
    ctx.lineTo(417, 140);
    ctx.closePath();
    ctx.fill();

    // Inner bright pupils
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(155, 118, 26, 22);
    ctx.fillRect(331, 118, 26, 22);

    ctx.fillStyle = subColor;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isActiveTurn ? '>>> TRANSMITTING <<<' : 'GHOST-01 // LOCKED', 256, 215);
  } else if (character.visorStyle === 'tesla') {
    // VOLT-9 Heavy industrial slit visor + high-voltage arcs
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(30, 60, 452, 110);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 60, 452, 110);

    // Glowing amber optic slits
    ctx.fillStyle = mainColor;
    ctx.fillRect(65, 95, 145, 36);
    ctx.fillRect(302, 95, 145, 36);

    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(110, 103, 55, 20);
    ctx.fillRect(347, 103, 55, 20);

    ctx.fillStyle = mainColor;
    ctx.font = '900 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ HIGH VOLTAGE CORE ⚡', 256, 216);
  } else if (character.visorStyle === 'dome') {
    // PROXY-X Dual circular synth optics + neural waveform
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(155, 118, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(357, 118, 44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = subColor;
    ctx.beginPath();
    ctx.arc(155, 118, 20, 0, Math.PI * 2);
    ctx.arc(357, 118, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mainColor;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SYNTHESIS // NEURAL LINK', 256, 216);
  } else {
    // NULL-404 Oscilloscope glitch visor + menacing cyber-eyes
    ctx.strokeStyle = subColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(85, 68, 120, 76);
    ctx.strokeRect(307, 68, 120, 76);

    ctx.fillStyle = mainColor;
    ctx.fillRect(120, 88, 50, 36);
    ctx.fillRect(342, 88, 50, 36);

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, 195);
    ctx.lineTo(160, 195);
    ctx.lineTo(190, 160);
    ctx.lineTo(225, 228);
    ctx.lineTo(260, 155);
    ctx.lineTo(295, 220);
    ctx.lineTo(325, 195);
    ctx.lineTo(472, 195);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  visorTextureCache.set(key, tex);
  return tex;
}
