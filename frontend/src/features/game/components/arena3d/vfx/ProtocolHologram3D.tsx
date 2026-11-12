import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import type { Group, MeshBasicMaterial } from 'three';
import { CanvasTexture, DoubleSide } from 'three';

import type { CardProtocol } from '../../../schemas/gameEvents';
import { prefersReducedMotion } from '../hud/motion';

export interface ProtocolHologram3DProps {
  protocol: CardProtocol | null;
}

const PROTOCOL_CONFIG: Record<
  CardProtocol,
  { symbol: string; label: string; color: string }
> = {
  Alpha: { symbol: 'α', label: 'PROTOCOL ALPHA', color: '#10b981' },
  Beta: { symbol: 'β', label: 'PROTOCOL BETA', color: '#f97316' },
  Gamma: { symbol: 'γ', label: 'PROTOCOL GAMMA', color: '#38bdf8' },
  Glitch: { symbol: '⚡', label: 'PROTOCOL GLITCH', color: '#ec4899' },
  Corrupted: { symbol: '☠', label: 'CORRUPTED', color: '#ef4444' },
};

function createHologramTexture(protocol: CardProtocol | null): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cfg = protocol ? PROTOCOL_CONFIG[protocol] : PROTOCOL_CONFIG.Alpha;

  ctx.clearRect(0, 0, 256, 256);

  // Outer glowing ring
  ctx.save();
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 4;
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  // Segmented inner reticle
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 8, 4, 8]);
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const r = 118;
  const bLen = 14;
  const corners = [
    [128 - r, 128 - r],
    [128 + r, 128 - r],
    [128 - r, 128 + r],
    [128 + r, 128 + r],
  ];
  ctx.lineWidth = 3;
  for (const [cx, cy] of corners) {
    const dx = cx < 128 ? 1 : -1;
    const dy = cy < 128 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * bLen);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * bLen, cy);
    ctx.stroke();
  }

  // Central symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 88px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = 20;
  ctx.fillText(cfg.symbol, 128, 116);

  // Protocol label
  ctx.fillStyle = cfg.color;
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.shadowBlur = 8;
  ctx.fillText(cfg.label, 128, 186);

  // Scanline overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 2);
  }

  ctx.restore();

  const texture = new CanvasTexture(canvas);
  return texture;
}

export const ProtocolHologram3D: React.FC<ProtocolHologram3DProps> = ({ protocol }) => {
  const groupRef = useRef<Group>(null);
  const matRef = useRef<MeshBasicMaterial>(null);

  const texture = useMemo(() => createHologramTexture(protocol), [protocol]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (prefersReducedMotion()) {
      groupRef.current.position.y = 1.32;
      groupRef.current.rotation.y = 0;
      if (matRef.current) matRef.current.opacity = 0.85;
      return;
    }

    const t = Date.now() / 1000;
    groupRef.current.position.y = 1.32 + Math.sin(t * 2.2) * 0.025;
    groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.12;

    if (matRef.current) {
      // Subtle holographic flicker
      matRef.current.opacity = 0.82 + Math.sin(t * 16) * 0.05;
    }
  });

  if (!texture) return null;

  return (
    <group ref={groupRef} position={[0, 1.32, -0.15]}>
      <mesh>
        <planeGeometry args={[0.78, 0.78]} />
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={0.85}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
