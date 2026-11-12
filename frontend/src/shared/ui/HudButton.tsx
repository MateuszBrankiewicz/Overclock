import clsx from 'clsx';
import React from 'react';

export type HudButtonVariant =
  | 'primary'
  | 'danger'
  | 'warning'
  | 'accent'
  | 'ghost';
export type HudButtonSize = 'sm' | 'md' | 'lg';

export interface HudButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HudButtonVariant;
  size?: HudButtonSize;
  active?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<HudButtonVariant, string> = {
  primary:
    'bg-emerald-950/80 text-emerald-300 border-emerald-500/80 hover:bg-emerald-900/90 hover:border-emerald-400 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  danger:
    'bg-red-950/80 text-red-300 border-red-500/80 hover:bg-red-900/90 hover:border-red-400 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]',
  warning:
    'bg-amber-950/80 text-amber-300 border-amber-500/80 hover:bg-amber-900/90 hover:border-amber-400 hover:text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  accent:
    'bg-cyan-950/80 text-cyan-300 border-cyan-500/80 hover:bg-cyan-900/90 hover:border-cyan-400 hover:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  ghost:
    'bg-black/60 text-zinc-300 border-zinc-700/80 hover:bg-zinc-900/80 hover:border-zinc-500 hover:text-white',
};

const SIZE_CLASSES: Record<HudButtonSize, string> = {
  sm: 'min-h-[28px] px-2.5 py-1 text-[11px] rounded-md gap-1.5',
  md: 'min-h-[38px] px-4 py-1.5 text-xs rounded-lg gap-2',
  lg: 'min-h-[48px] px-6 py-2.5 text-sm rounded-xl gap-2.5 tracking-wider',
};

export const HudButton: React.FC<HudButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  active = false,
  pulse = false,
  disabled = false,
  children,
  className,
  onClick,
  ...props
}) => {
  return (
    <button
      type="button"
      data-testid="hud-button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={clsx(
        'inline-flex items-center justify-center font-mono font-bold border transition-all duration-150 select-none backdrop-blur-sm cursor-pointer',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        active && 'ring-2 ring-emerald-400 border-emerald-300',
        pulse && 'motion-safe:animate-pulse',
        disabled &&
          'opacity-40 cursor-not-allowed pointer-events-none hover:bg-transparent shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
