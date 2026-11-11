import clsx from 'clsx';
import React from 'react';

export interface CapacitorMeterProps {
  riskLevel: number;
  maxRisk?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  isPendingDischarge?: boolean;
  showBreakdownRisk?: boolean;
  className?: string;
}

const RISK_CONFIG: Record<
  number,
  { label: string; color: string; bgActive: string; textClass: string; glowClass: string }
> = {
  1: {
    label: 'STABLE',
    color: '#00ff66',
    bgActive: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    glowClass: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  2: {
    label: 'NOMINAL',
    color: '#10b981',
    bgActive: 'bg-emerald-400',
    textClass: 'text-emerald-300',
    glowClass: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  },
  3: {
    label: 'ELEVATED',
    color: '#ffb000',
    bgActive: 'bg-amber-400',
    textClass: 'text-amber-400',
    glowClass: 'shadow-[0_0_10px_rgba(251,191,36,0.6)]',
  },
  4: {
    label: 'HIGH VOLTAGE',
    color: '#f97316',
    bgActive: 'bg-orange-500',
    textClass: 'text-orange-400',
    glowClass: 'shadow-[0_0_12px_rgba(249,115,22,0.7)]',
  },
  5: {
    label: 'CRITICAL',
    color: '#ef4444',
    bgActive: 'bg-red-500',
    textClass: 'text-red-400',
    glowClass: 'shadow-[0_0_14px_rgba(239,68,68,0.8)]',
  },
  6: {
    label: 'OVERLOAD IMMINENT',
    color: '#ff0033',
    bgActive: 'bg-red-600 animate-pulse',
    textClass: 'text-red-500 font-bold animate-pulse',
    glowClass: 'shadow-[0_0_18px_rgba(255,0,51,0.95)]',
  },
};

export const CapacitorMeter: React.FC<CapacitorMeterProps> = ({
  riskLevel,
  maxRisk = 6,
  label = 'CAPACITOR C1',
  size = 'md',
  isPendingDischarge = false,
  showBreakdownRisk = true,
  className,
}) => {
  const clampedRisk = Math.min(Math.max(riskLevel, 1), maxRisk);
  const currentConfig = RISK_CONFIG[clampedRisk] ?? RISK_CONFIG[1];
  const overloadProbability = Math.round((clampedRisk / maxRisk) * 100);

  const sizeClasses = {
    sm: 'text-xs p-2 gap-1.5',
    md: 'text-sm p-3 gap-2',
    lg: 'text-base p-4 gap-3',
  }[size];

  const barHeight = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedRisk}
      aria-valuemin={1}
      aria-valuemax={maxRisk}
      aria-label={`${label} risk level ${clampedRisk} of ${maxRisk}`}
      className={clsx(
        'flex flex-col rounded-md border font-mono select-none transition-all duration-300',
        'bg-cyber-panel/90 backdrop-blur-sm',
        isPendingDischarge
          ? 'border-cyber-red shadow-[0_0_20px_rgba(255,0,51,0.4)] animate-pulse'
          : 'border-cyber-border/80',
        sizeClasses,
        className
      )}
    >
      {/* Header with diegetic capacitor name & status readout */}
      <div className="flex items-center justify-between gap-2 border-b border-cyber-border/40 pb-1">
        <div className="flex items-center gap-1.5">
          {/* Electrolytic capacitor symbol icon */}
          <span className="text-[10px] text-zinc-500 tracking-wider font-semibold">
            {label}
          </span>
          {isPendingDischarge && (
            <span className="px-1 py-0.2 text-[9px] font-bold bg-cyber-red/20 text-cyber-red border border-cyber-red/40 rounded animate-pulse">
              HOT
            </span>
          )}
        </div>
        <span className={clsx('text-[11px] font-bold tracking-tight', currentConfig.textClass)}>
          {`LVL ${clampedRisk}/${maxRisk} · ${currentConfig.label}`}
        </span>
      </div>

      {/* Capacitor visual: 6 discrete dielectric breakdown segments */}
      <div className="grid grid-cols-6 gap-1 w-full py-0.5">
        {Array.from({ length: maxRisk }, (_, index) => {
          const segmentLevel = index + 1;
          const isActive = segmentLevel <= clampedRisk;
          const segConfig = RISK_CONFIG[segmentLevel] ?? RISK_CONFIG[1];

          return (
            <div
              key={segmentLevel}
              data-testid={`capacitor-segment-${segmentLevel}`}
              className={clsx(
                'rounded-sm transition-all duration-200',
                barHeight,
                isActive
                  ? clsx(segConfig.bgActive, segConfig.glowClass)
                  : 'bg-zinc-800/80 border border-zinc-700/30'
              )}
            />
          );
        })}
      </div>

      {/* Dielectric breakdown probability readout */}
      {showBreakdownRisk && (
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
          <span className="text-zinc-500">BREAKDOWN CHANCE:</span>
          <span
            data-testid="breakdown-probability"
            className={clsx(
              'font-semibold',
              clampedRisk >= 5 ? 'text-cyber-red font-bold' : clampedRisk >= 3 ? 'text-cyber-amber' : 'text-zinc-300'
            )}
          >
            {`${overloadProbability}% (≤${clampedRisk} on d6)`}
          </span>
        </div>
      )}
    </div>
  );
};
