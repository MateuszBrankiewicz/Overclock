import * as THREE from 'three';

let cachedWallTexture: THREE.CanvasTexture | null = null;
let cachedDustSprite: THREE.CanvasTexture | null = null;

/** Riveted concrete wall panels with a worn hazard band near the floor. Tiles horizontally. */
export function getBunkerWallTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cachedWallTexture) {
    return cachedWallTexture;
  }
  const W = 1024;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#1b1e25');
  base.addColorStop(0.6, '#22262e');
  base.addColorStop(1, '#14161b');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Panel tone variance
  const panelW = W / 4;
  const panelH = H / 2;
  const tones = [0.05, -0.04, 0.02, -0.06, -0.03, 0.04, -0.05, 0.03];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const tone = tones[row * 4 + col] ?? 0;
      ctx.fillStyle = tone > 0 ? `rgba(255,255,255,${tone})` : `rgba(0,0,0,${-tone * 2.4})`;
      ctx.fillRect(col * panelW, row * panelH, panelW, panelH);
    }
  }

  // Water streaks running down from the ceiling
  for (let i = 0; i < 46; i++) {
    const x = (i * 197) % W;
    const length = 60 + ((i * 53) % 220);
    const streak = ctx.createLinearGradient(0, 0, 0, length);
    streak.addColorStop(0, 'rgba(0,0,0,0.3)');
    streak.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 0, 3 + (i % 4) * 2, length);
  }

  // Panel seams with a lit lower edge + rivets
  for (let col = 0; col <= 4; col++) {
    const x = col * panelW;
    ctx.fillStyle = '#07080b';
    ctx.fillRect(x - 3, 0, 6, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 3, 0, 2, H);
  }
  for (let row = 0; row <= 2; row++) {
    const y = row * panelH;
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, y - 3, W, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y + 3, W, 2);
  }
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      for (const [rx, ry] of [
        [18, 18],
        [panelW - 18, 18],
        [18, panelH - 18],
        [panelW - 18, panelH - 18],
      ] as const) {
        const x = col * panelW + rx;
        const y = row * panelH + ry;
        ctx.fillStyle = '#0a0b0e';
        ctx.beginPath();
        ctx.arc(x, y + 1, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b414c';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Hazard band near the floor
  const bandY = H - 74;
  const bandH = 34;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bandY, W, bandH);
  ctx.clip();
  ctx.fillStyle = '#0c0d10';
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = 'rgba(217, 144, 28, 0.55)';
  for (let x = -bandH; x < W + bandH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, bandY + bandH);
    ctx.lineTo(x + bandH, bandY);
    ctx.lineTo(x + bandH + 32, bandY);
    ctx.lineTo(x + 32, bandY + bandH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Floor grime
  const grime = ctx.createLinearGradient(0, H - 110, 0, H);
  grime.addColorStop(0, 'rgba(0,0,0,0)');
  grime.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grime;
  ctx.fillRect(0, H - 110, W, 110);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  cachedWallTexture = texture;
  return texture;
}

/** Soft round sprite for dust motes (default point sprites are hard squares). */
export function getDustSpriteTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cachedDustSprite) {
    return cachedDustSprite;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  cachedDustSprite = new THREE.CanvasTexture(canvas);
  return cachedDustSprite;
}

export function clearBunkerWallTextureCacheForTests(): void {
  cachedWallTexture?.dispose();
  cachedWallTexture = null;
  cachedDustSprite?.dispose();
  cachedDustSprite = null;
}
