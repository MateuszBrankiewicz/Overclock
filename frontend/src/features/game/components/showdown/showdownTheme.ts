import { useEffect, useState } from 'react';

/** True once the wall clock passes `atMs`; already true on first render when it is in the past. */
export function useReached(atMs: number | null): boolean {
  const [reachedFor, setReachedFor] = useState<number | null>(() =>
    atMs !== null && Date.now() >= atMs ? atMs : null
  );
  useEffect(() => {
    if (atMs === null) return;
    const timer = setTimeout(() => setReachedFor(atMs), Math.max(0, atMs - Date.now()));
    return () => clearTimeout(timer);
  }, [atMs]);
  return atMs !== null && reachedFor === atMs;
}

export type ShowdownTone = 'amber' | 'red' | 'emerald' | 'sky';

export const TONE: Record<
  ShowdownTone,
  { frame: string; text: string; bar: string; soft: string; hex: string }
> = {
  amber: {
    frame: 'border-amber-500/80 shadow-[0_0_44px_rgba(245,158,11,0.35)]',
    text: 'text-amber-300',
    bar: 'bg-amber-400',
    soft: 'border-amber-500/70 bg-amber-950/50',
    hex: '#f59e0b',
  },
  red: {
    frame: 'border-red-500/90 shadow-[0_0_52px_rgba(239,68,68,0.5)]',
    text: 'text-red-400',
    bar: 'bg-red-500',
    soft: 'border-red-500/80 bg-red-950/50',
    hex: '#ef4444',
  },
  emerald: {
    frame: 'border-emerald-400/90 shadow-[0_0_48px_rgba(52,211,153,0.45)]',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
    soft: 'border-emerald-400/70 bg-emerald-950/50',
    hex: '#34d399',
  },
  sky: {
    frame: 'border-sky-400/90 shadow-[0_0_48px_rgba(56,189,248,0.45)]',
    text: 'text-sky-300',
    bar: 'bg-sky-400',
    soft: 'border-sky-400/70 bg-sky-950/50',
    hex: '#38bdf8',
  },
};
