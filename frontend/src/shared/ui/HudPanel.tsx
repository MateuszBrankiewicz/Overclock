import clsx from 'clsx';
import React from 'react';

export type HudPanelTone = 'default' | 'accent' | 'danger' | 'warning' | 'info';

export interface HudPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: HudPanelTone;
  cornerBrackets?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<HudPanelTone, string> = {
  default: 'border-zinc-800/80 text-zinc-200 bg-black/85 shadow-2xl',
  accent:
    'border-emerald-500/80 text-emerald-300 bg-zinc-950/90 shadow-[0_0_30px_rgba(16,185,129,0.3)]',
  danger:
    'border-red-500/80 text-red-300 bg-red-950/85 shadow-[0_0_30px_rgba(239,68,68,0.35)]',
  warning:
    'border-amber-500/80 text-amber-300 bg-amber-950/80 shadow-[0_0_30px_rgba(245,158,11,0.3)]',
  info: 'border-cyan-500/80 text-cyan-300 bg-cyan-950/80 shadow-[0_0_30px_rgba(6,182,212,0.3)]',
};

const BRACKET_COLOR: Record<HudPanelTone, string> = {
  default: 'border-zinc-600',
  accent: 'border-emerald-400',
  danger: 'border-red-400',
  warning: 'border-amber-400',
  info: 'border-cyan-400',
};

export const HudPanel: React.FC<HudPanelProps> = ({
  tone = 'default',
  cornerBrackets = true,
  children,
  className,
  ...props
}) => {
  const bracketClass = BRACKET_COLOR[tone];

  return (
    <div
      data-testid="hud-panel"
      className={clsx(
        'relative rounded-xl border font-mono backdrop-blur-md transition-colors duration-200',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {cornerBrackets && (
        <>
          <span
            aria-hidden="true"
            className={clsx(
              'absolute top-1 left-1 w-1.5 h-1.5 border-t border-l pointer-events-none opacity-70',
              bracketClass
            )}
          />
          <span
            aria-hidden="true"
            className={clsx(
              'absolute top-1 right-1 w-1.5 h-1.5 border-t border-r pointer-events-none opacity-70',
              bracketClass
            )}
          />
          <span
            aria-hidden="true"
            className={clsx(
              'absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l pointer-events-none opacity-70',
              bracketClass
            )}
          />
          <span
            aria-hidden="true"
            className={clsx(
              'absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r pointer-events-none opacity-70',
              bracketClass
            )}
          />
        </>
      )}
      {children}
    </div>
  );
};
