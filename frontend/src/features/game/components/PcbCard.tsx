import clsx from 'clsx';
import React, { useMemo } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CardProtocol } from '../schemas/gameEvents';
import { generatePcbTraces } from '../utils/pcbTraceGenerator';

export interface PcbCardProps {
  id?: string;
  protocol?: CardProtocol;
  visualSeed?: number;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  hoverable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  badge?: 'match' | 'wild' | 'bluff' | null;
  onClick?: () => void;
  className?: string;
}

const PROTOCOL_CONFIG: Record<
  CardProtocol,
  { label: string; token: string; substrate: string; traceColor: string; borderColor: string; textColor: string; neonGlow: string }
> = {
  Alpha: {
    label: 'ALPHA',
    token: '[A]',
    substrate: 'bg-emerald-950',
    traceColor: '#f59e0b', // ENIG gold traces
    borderColor: 'border-emerald-500/80',
    textColor: 'text-emerald-300',
    neonGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
  },
  Beta: {
    label: 'BETA',
    token: '[B]',
    substrate: 'bg-amber-950',
    traceColor: '#f97316', // Bare Copper traces
    borderColor: 'border-amber-500/80',
    textColor: 'text-amber-300',
    neonGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
  },
  Gamma: {
    label: 'GAMMA',
    token: '[G]',
    substrate: 'bg-cyan-950',
    traceColor: '#38bdf8', // Silver solder pads & traces
    borderColor: 'border-cyan-500/80',
    textColor: 'text-cyan-300',
    neonGlow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
  },
  Glitch: {
    label: 'OVERRIDE',
    token: '[!]',
    substrate: 'bg-purple-950',
    traceColor: '#e879f9', // Neon purple traces
    borderColor: 'border-fuchsia-500/90',
    textColor: 'text-fuchsia-200',
    neonGlow: 'shadow-[0_0_20px_rgba(217,70,239,0.5)]',
  },
  Corrupted: {
    label: 'CORRUPTED',
    token: '[X]',
    substrate: 'bg-zinc-950',
    traceColor: '#991b1b', // Burnt sever traces
    borderColor: 'border-red-900/90',
    textColor: 'text-red-500',
    neonGlow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  },
};

export const PcbCard: React.FC<PcbCardProps> = ({
  id,
  protocol = 'Alpha',
  visualSeed = 0,
  faceDown = false,
  selected = false,
  disabled = false,
  hoverable = true,
  size = 'md',
  badge,
  onClick,
  className,
}) => {
  const { t } = useI18n();
  const traces = useMemo(() => generatePcbTraces(visualSeed), [visualSeed]);
  const config = PROTOCOL_CONFIG[protocol];

  const sizeClasses = {
    sm: 'w-16 h-24 text-[9px]',
    md: 'w-24 h-36 text-[11px]',
    lg: 'w-32 h-48 text-xs',
  }[size];

  if (faceDown) {
    return (
      <div
        data-testid="pcb-card-back"
        onClick={!disabled ? onClick : undefined}
        className={clsx(
          'relative rounded-md border p-1.5 flex flex-col justify-between font-mono select-none overflow-hidden pcb-chip-3d',
          'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-zinc-700/80 text-zinc-500 shadow-xl',
          sizeClasses,
          hoverable && !disabled && 'cursor-pointer',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        <div className="flex justify-between items-center text-[8px] tracking-tighter z-10 font-bold text-zinc-400">
          <span>DEAD CIRCUIT</span>
          <span>REV 1.4</span>
        </div>
        <svg viewBox="0 0 100 140" className="w-full h-full opacity-35 absolute inset-0">
          <circle cx="50" cy="70" r="28" stroke="#52525b" strokeWidth="2" fill="none" />
          <path d="M 15 70 L 85 70 M 50 35 L 50 105" stroke="#71717a" strokeWidth="1.5" />
          <rect x="36" y="56" width="28" height="28" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" />
          <circle cx="50" cy="70" r="6" fill="#3f3f46" stroke="#e4e4e7" strokeWidth="1" />
          <line x1="10" y1="20" x2="90" y2="20" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="10" y1="120" x2="90" y2="120" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
        <div className="text-[7px] text-center tracking-widest text-emerald-500/80 font-bold z-10 bg-black/80 py-0.5 rounded border border-zinc-800">
          {t.table.busEncrypted}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pcb-card"
      data-protocol={protocol}
      onClick={!disabled ? onClick : undefined}
      className={clsx(
        'relative rounded-md border p-1.5 flex flex-col justify-between font-mono select-none overflow-hidden pcb-chip-3d',
        config.substrate,
        config.borderColor,
        config.neonGlow,
        sizeClasses,
        selected && 'pcb-chip-selected ring-2 ring-emerald-400',
        hoverable && !disabled && !selected && 'cursor-pointer',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {/* Top Header */}
      <div className="flex justify-between items-center z-10">
        <span className={clsx('font-black tracking-tight', config.textColor)}>{config.token}</span>
        {badge ? (
          <span
            className={clsx(
              'text-[7px] font-black uppercase px-1 py-0.2 rounded border shadow-xs',
              badge === 'match' && 'bg-emerald-950 text-emerald-300 border-emerald-500',
              badge === 'wild' && 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500 animate-pulse',
              badge === 'bluff' && 'bg-amber-950 text-amber-300 border-amber-600'
            )}
          >
            {badge === 'match'
              ? t.controls.legendMatch
              : badge === 'wild'
                ? t.controls.legendWild
                : t.controls.legendBluff}
          </span>
        ) : (
          <span className="text-[8px] text-zinc-300 font-bold bg-black/70 px-1 py-0.2 rounded border border-zinc-800">
            {id ? id.slice(0, 4) : 'BUS'}
          </span>
        )}
      </div>

      {/* SVG PCB Traces Layer */}
      <svg viewBox="0 0 100 140" className="absolute inset-0 w-full h-full pointer-events-none opacity-90">
        {traces.buses.map((b, i) => (
          <path key={`bus-${i}`} d={b.d} fill="none" stroke={config.traceColor} strokeWidth="1.8" strokeLinecap="round" />
        ))}
        {traces.lines.map((l, i) => (
          <line key={`line-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={config.traceColor} strokeWidth="1.4" />
        ))}
        {traces.vias.map((v, i) => (
          <circle key={`via-${i}`} cx={v.cx} cy={v.cy} r={v.r} fill={config.traceColor} stroke="#000" strokeWidth="0.6" />
        ))}
      </svg>

      {/* Center Microcontroller Die / Label */}
      <div className="z-10 flex flex-col items-center justify-center py-1">
        <div className="px-2 py-0.5 rounded bg-black/85 border border-zinc-700 backdrop-blur-xs flex items-center gap-1 shadow-md">
          <span className={clsx('font-black tracking-wider text-[10px]', config.textColor)}>{config.label}</span>
        </div>
      </div>

      {/* Footer Pinout */}
      <div className="flex justify-between items-center text-[7px] text-zinc-300 font-bold z-10 pt-1 border-t border-zinc-800/80 bg-black/40 px-0.5">
        <span>PIN-8</span>
        <span className={config.textColor}>{protocol}</span>
      </div>
    </div>
  );
};
