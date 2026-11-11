import * as THREE from 'three';

const badgeCache = new Map<string, THREE.CanvasTexture>();

export function createDischargeBadgeTexture(
  roll: number,
  riskLevel: number,
  overloaded: boolean,
  resultingRiskLevel: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cacheKey = `${roll}:${riskLevel}:${overloaded ? '1' : '0'}:${resultingRiskLevel}`;
  const cached = badgeCache.get(cacheKey);
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

  const mainColor = overloaded ? '#ef4444' : '#10b981';
  const bgColor = '#050508';

  // Dark cyber plate background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle telemetry grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Border glow
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 240);

  // Corner brackets
  ctx.fillStyle = mainColor;
  ctx.fillRect(8, 8, 24, 6);
  ctx.fillRect(8, 8, 6, 24);
  ctx.fillRect(480, 8, 24, 6);
  ctx.fillRect(498, 8, 6, 24);
  ctx.fillRect(8, 242, 24, 6);
  ctx.fillRect(8, 224, 6, 24);
  ctx.fillRect(480, 242, 24, 6);
  ctx.fillRect(498, 224, 6, 24);

  // Header banner
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = mainColor;
  ctx.textAlign = 'center';
  ctx.fillText(
    overloaded ? '⚡ DIELECTRIC OVERLOAD DETECTED' : '🛡️ DIELECTRIC DISCHARGE STABILIZED',
    256,
    44
  );

  // Divider line
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 58);
  ctx.lineTo(488, 58);
  ctx.stroke();

  // Left Column: D6 Roll
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('D6 ROLL', 140, 92);

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 54px monospace';
  ctx.fillText(String(roll), 140, 150);

  // Center VS separator
  ctx.fillStyle = '#71717a';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('VS', 256, 136);

  // Right Column: Risk Level
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`RISK: ${riskLevel}/6`, 372, 92);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 54px monospace';
  ctx.fillText(`≤ ${riskLevel}`, 372, 150);

  // Bottom Status Banner
  ctx.fillStyle = overloaded ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  ctx.fillRect(24, 182, 464, 52);
  ctx.strokeStyle = mainColor;
  ctx.strokeRect(24, 182, 464, 52);

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    overloaded
      ? `RZUT ${roll} ≤ ${riskLevel} // ZWARCIE // WYELIMINOWANY`
      : `RZUT ${roll} > ${riskLevel} // PRZETRWAŁ // RYZYKO: ${resultingRiskLevel}/6`,
    256,
    215
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  badgeCache.set(cacheKey, texture);
  return texture;
}
