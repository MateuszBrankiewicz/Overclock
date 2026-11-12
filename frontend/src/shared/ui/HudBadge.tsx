import clsx from 'clsx';
import React from 'react';

export type HudBadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';
export type HudBadgeSize = 'sm' | 'md';

export interface HudBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: HudBadgeVariant;
  size?: HudBadgeSize;
  children?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<HudBadgeVariant, string> = {
  default: 'bg-zinc-900 text-zinc-300 border-zinc-700/80',
  success: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70',
  danger: 'bg-red-950/80 text-red-300 border-red-500/70',
  warning: 'bg-amber-950/80 text-amber-300 border-amber-500/70',
  info: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/70',
};

const SIZE_CLASSES: Record<HudBadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 rounded gap-1',
  md: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
};

export const HudBadge: React.FC<HudBadgeProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  className,
  ...props
}) => {
  return (
    <span
      data-testid="hud-badge"
      className={clsx(
        'inline-flex items-center font-mono font-bold uppercase tracking-wider border select-none',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
