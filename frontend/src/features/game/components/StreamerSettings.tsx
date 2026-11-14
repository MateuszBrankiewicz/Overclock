import { Eye, EyeOff, Shield } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useUiStore } from '../stores/useUiStore';

/**
 * Streamer Safe Mode controls:
 * - Mask Room Code (renders `CYBER-***` in HUD/Lobby)
 * - Hold to Reveal Cards (cards remain face down until holding `H` or the reveal button)
 */
export const StreamerSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const maskRoomCode = useUiStore((s) => s.maskRoomCode);
  const holdToRevealCards = useUiStore((s) => s.holdToRevealCards);
  const isHandRevealed = useUiStore((s) => s.isHandRevealed);
  const setMaskRoomCode = useUiStore((s) => s.setMaskRoomCode);
  const setHoldToRevealCards = useUiStore((s) => s.setHoldToRevealCards);
  const setHandRevealed = useUiStore((s) => s.setHandRevealed);

  const isActive = maskRoomCode || holdToRevealCards;

  useEffect(() => {
    if (!holdToRevealCards) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        setHandRevealed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        setHandRevealed(false);
      }
    };

    const handleBlur = () => setHandRevealed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [holdToRevealCards, setHandRevealed]);

  return (
    <div className="relative flex items-center gap-1.5">
      {holdToRevealCards && (
        <button
          type="button"
          data-testid="hold-reveal-btn"
          onPointerDown={() => setHandRevealed(true)}
          onPointerUp={() => setHandRevealed(false)}
          onPointerLeave={() => setHandRevealed(false)}
          onPointerCancel={() => setHandRevealed(false)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-bold transition-colors cursor-pointer select-none ${
            isHandRevealed
              ? 'bg-emerald-500 text-black border-emerald-400'
              : 'bg-zinc-900 text-amber-300 border-amber-500/50 hover:border-amber-400'
          }`}
          title="Hold to Reveal Cards (H)"
        >
          {isHandRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>HOLD [H]</span>
        </button>
      )}

      <button
        type="button"
        data-testid="streamer-mode-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-1 rounded transition-colors cursor-pointer ${
          isActive
            ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25'
            : 'text-zinc-400 hover:text-emerald-300'
        }`}
        title="Streamer Mode"
        aria-expanded={isOpen}
      >
        <Shield className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          data-testid="streamer-settings-popover"
          className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-zinc-700 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-2.5"
        >
          <div className="font-black text-amber-300 tracking-wider uppercase flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Streamer Safe Mode</span>
          </div>

          <label className="flex items-center justify-between gap-2 cursor-pointer text-zinc-200">
            <span>Mask Room Code (CYBER-***)</span>
            <input
              type="checkbox"
              checked={maskRoomCode}
              onChange={(e) => setMaskRoomCode(e.target.checked)}
              className="accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 cursor-pointer text-zinc-200">
            <span>Hold [H] to Reveal Cards</span>
            <input
              type="checkbox"
              checked={holdToRevealCards}
              onChange={(e) => setHoldToRevealCards(e.target.checked)}
              className="accent-emerald-500 cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  );
};
