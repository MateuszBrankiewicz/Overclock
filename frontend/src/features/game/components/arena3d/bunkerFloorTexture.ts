import * as THREE from 'three';

let cachedFloorTexture: THREE.CanvasTexture | null = null;
let cachedTableAoTexture: THREE.CanvasTexture | null = null;

export function getBunkerFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cachedFloorTexture) {
    return cachedFloorTexture;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  // Base concrete dark tone
  ctx.fillStyle = '#111116';
  ctx.fillRect(0, 0, 512, 512);

  // 4x4 concrete slabs with slight brightness variance
  const tileSize = 128;
  const slabTones = [
    '#131319', '#101015', '#15151c', '#121218',
    '#0f0f14', '#14141b', '#111116', '#16161d',
    '#121217', '#15151b', '#0e0e13', '#13131a',
    '#14141c', '#111117', '#16161e', '#101015',
  ];

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const idx = y * 4 + x;
      ctx.fillStyle = slabTones[idx % slabTones.length] ?? '#111116';
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }

  // Seam lines between slabs
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle industrial stains / wear speckles
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  for (let i = 0; i < 40; i++) {
    const rx = ((i * 137) % 500) + 6;
    const ry = ((i * 241) % 500) + 6;
    const rw = (i % 5) * 8 + 12;
    const rh = (i % 4) * 6 + 8;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, (i * 0.4) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Expansion joint wear and hazard stripe along one edge
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(512, 4);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  cachedFloorTexture = texture;
  return texture;
}

export function getTableAoTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cachedTableAoTexture) {
    return cachedTableAoTexture;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.78, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  cachedTableAoTexture = texture;
  return texture;
}

export function clearBunkerTextureCacheForTests(): void {
  if (cachedFloorTexture) {
    cachedFloorTexture.dispose();
    cachedFloorTexture = null;
  }
  if (cachedTableAoTexture) {
    cachedTableAoTexture.dispose();
    cachedTableAoTexture = null;
  }
}
