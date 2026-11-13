import * as THREE from 'three';

export interface TableSurfaceTextures {
  /** Dark dielectric mat with faint copper traces. */
  albedo: THREE.CanvasTexture;
  /** White-on-black trace mask: tinted at runtime by the stage accent colour. */
  emissive: THREE.CanvasTexture;
}

const SIZE = 1024;
const SEATS = 8;

let cached: TableSurfaceTextures | null = null;
let cachedFloorGlow: THREE.CanvasTexture | null = null;

interface PatternStyle {
  line: string;
  dim: string;
  pad: string;
}

/** Deterministic pseudo-random stream so the mat looks the same on every client. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

/**
 * Circuit layout shared by both maps: bus ring around the pile, protocol ring, and one trace
 * bundle per table edge running out to a seat dock. Eight-fold symmetric, so it lines up with
 * the octagonal table regardless of how the mesh is rotated.
 */
function drawCircuit(ctx: CanvasRenderingContext2D, style: PatternStyle, withDetail: boolean): void {
  const c = SIZE / 2;
  const R = SIZE / 2;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Protocol ring + tick scale
  ctx.strokeStyle = style.line;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.63, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  for (let i = 0; i < 96; i++) {
    const angle = (i / 96) * Math.PI * 2;
    const long = i % 12 === 0;
    const [x1, y1] = polar(c, c, R * 0.648, angle);
    const [x2, y2] = polar(c, c, R * (long ? 0.685 : 0.664), angle);
    ctx.strokeStyle = long ? style.line : style.dim;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Central bus socket: solid ring + dashed guard ring
  ctx.strokeStyle = style.line;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.27, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = style.dim;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.arc(c, c, R * 0.305, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let seat = 0; seat < SEATS; seat++) {
    const angle = ((seat + 0.5) / SEATS) * Math.PI * 2;
    const normal = angle + Math.PI / 2;

    // Three-lane trace bundle from the bus socket to the protocol ring
    for (const lane of [-1, 0, 1]) {
      const offset = lane * 9;
      const ox = Math.cos(normal) * offset;
      const oy = Math.sin(normal) * offset;
      const [sx, sy] = polar(c, c, R * 0.305, angle);
      const [mx, my] = polar(c, c, R * (0.44 + lane * 0.025), angle);
      const [ex, ey] = polar(c, c, R * 0.6, angle);
      const jog = lane * 8;
      ctx.strokeStyle = lane === 0 ? style.line : style.dim;
      ctx.lineWidth = lane === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy + oy);
      ctx.lineTo(mx + ox, my + oy);
      ctx.lineTo(mx + ox + Math.cos(normal) * jog, my + oy + Math.sin(normal) * jog);
      ctx.lineTo(ex + ox + Math.cos(normal) * jog, ey + oy + Math.sin(normal) * jog);
      ctx.stroke();

      ctx.fillStyle = style.pad;
      ctx.beginPath();
      ctx.arc(ex + ox + Math.cos(normal) * jog, ey + oy + Math.sin(normal) * jog, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Seat dock: bracket near the table edge in front of every operator
    const [dx, dy] = polar(c, c, R * 0.8, angle);
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(angle + Math.PI / 2);
    ctx.strokeStyle = style.dim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-70, -22);
    ctx.lineTo(-84, -22);
    ctx.lineTo(-84, 22);
    ctx.lineTo(-70, 22);
    ctx.moveTo(70, -22);
    ctx.lineTo(84, -22);
    ctx.lineTo(84, 22);
    ctx.lineTo(70, 22);
    ctx.stroke();
    ctx.strokeStyle = style.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.lineTo(0, 78);
    ctx.stroke();
    ctx.restore();

    // Via cluster toward every table corner
    if (withDetail) {
      const cornerAngle = (seat / SEATS) * Math.PI * 2;
      for (let v = 0; v < 3; v++) {
        const [vx, vy] = polar(c, c, R * (0.74 + v * 0.045), cornerAngle);
        ctx.fillStyle = style.pad;
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function paintAlbedo(ctx: CanvasRenderingContext2D): void {
  const c = SIZE / 2;

  const base = ctx.createRadialGradient(c, c, 0, c, c, c);
  base.addColorStop(0, '#16201d');
  base.addColorStop(0.55, '#0f1614');
  base.addColorStop(1, '#080b0b');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Woven dielectric grain
  const random = createRandom(7);
  for (let i = 0; i < 5200; i++) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    const light = random() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y, 1 + random() * 2.5, 1 + random() * 2.5);
  }

  // Solder-mask dot grid
  ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
  for (let y = 16; y < SIZE; y += 32) {
    for (let x = 16; x < SIZE; x += 32) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  drawCircuit(
    ctx,
    { line: 'rgba(212, 170, 110, 0.34)', dim: 'rgba(212, 170, 110, 0.17)', pad: 'rgba(226, 190, 140, 0.4)' },
    true
  );

  // Wear: lighter scuffs where hands and cards slide
  for (let i = 0; i < 60; i++) {
    const angle = random() * Math.PI * 2;
    const radius = SIZE * (0.12 + random() * 0.34);
    const [x, y] = polar(c, c, radius, angle);
    ctx.strokeStyle = `rgba(255,255,255,${0.012 + random() * 0.022})`;
    ctx.lineWidth = 1 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 90);
    ctx.stroke();
  }
}

export function getTableSurfaceTextures(): TableSurfaceTextures | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cached) {
    return cached;
  }

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = SIZE;
  albedoCanvas.height = SIZE;
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = SIZE;
  emissiveCanvas.height = SIZE;

  const albedoCtx = albedoCanvas.getContext('2d');
  const emissiveCtx = emissiveCanvas.getContext('2d');
  if (!albedoCtx || !emissiveCtx) {
    return null;
  }

  paintAlbedo(albedoCtx);

  emissiveCtx.fillStyle = '#000000';
  emissiveCtx.fillRect(0, 0, SIZE, SIZE);
  drawCircuit(
    emissiveCtx,
    { line: 'rgba(255,255,255,0.95)', dim: 'rgba(255,255,255,0.32)', pad: 'rgba(255,255,255,0.8)' },
    false
  );

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 8;
  const emissive = new THREE.CanvasTexture(emissiveCanvas);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.anisotropy = 8;

  cached = { albedo, emissive };
  return cached;
}

/** Soft ring of light spilled on the floor by the LED strip under the table rim. */
export function getTableFloorGlowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (cachedFloorGlow) {
    return cachedFloorGlow;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.42, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.66, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  cachedFloorGlow = new THREE.CanvasTexture(canvas);
  return cachedFloorGlow;
}

export function clearTableSurfaceTextureCacheForTests(): void {
  cached?.albedo.dispose();
  cached?.emissive.dispose();
  cached = null;
  cachedFloorGlow?.dispose();
  cachedFloorGlow = null;
}
