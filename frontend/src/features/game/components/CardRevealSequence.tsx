import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

import type { PlayerCard } from '../schemas/gameEvents';
import { useActionQueue } from '../stores/useActionQueue';
import { PcbCard } from './PcbCard';

export interface CardRevealSequenceProps {
  revealedCards: PlayerCard[];
  declaredProtocol: string;
  bluffDetected: boolean;
  accuserNickname: string;
  accusedNickname: string;
  onSequenceComplete?: () => void;
}

export const CardRevealSequence: React.FC<CardRevealSequenceProps> = ({
  revealedCards,
  declaredProtocol,
  bluffDetected,
  accuserNickname,
  accusedNickname,
  onSequenceComplete,
}) => {
  const [flippedCount, setFlippedCount] = useState<number>(0);
  const [showVerdict, setShowVerdict] = useState<boolean>(false);

  useEffect(() => {
    // Staggered 3D flip: 220ms per card
    const timers: ReturnType<typeof setTimeout>[] = [];
    revealedCards.forEach((_, index) => {
      const t = setTimeout(() => {
        setFlippedCount((prev) => Math.max(prev, index + 1));
      }, (index + 1) * 220);
      timers.push(t);
    });

    // Show verdict after all cards have flipped
    const verdictDelay = (revealedCards.length + 1) * 220 + 300;
    const verdictTimer = setTimeout(() => {
      setShowVerdict(true);
    }, verdictDelay);
    timers.push(verdictTimer);

    // Complete sequence after pulse animation
    const completeTimer = setTimeout(() => {
      onSequenceComplete?.();
      useActionQueue.getState().completeCurrentAction();
    }, verdictDelay + 1800);
    timers.push(completeTimer);

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [revealedCards, onSequenceComplete]);

  return (
    <motion.div
      data-testid="card-reveal-sequence"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border font-mono transition-all duration-700 max-w-xl mx-auto w-full backdrop-blur-md pointer-events-none select-none',
        showVerdict
          ? bluffDetected
            ? 'bg-gradient-to-b from-red-950/95 via-black/95 to-red-950/80 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.6)]'
            : 'bg-gradient-to-b from-emerald-950/95 via-black/95 to-emerald-950/80 border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
          : 'bg-zinc-950/95 border-zinc-700 shadow-2xl'
      )}
    >
      <div className="text-xs tracking-wider font-black mb-2 flex items-center gap-2">
        <span
          className={clsx(
            'px-2 py-0.5 rounded text-[11px] animate-pulse font-extrabold',
            bluffDetected && showVerdict ? 'bg-red-500 text-black' : 'bg-emerald-400 text-black'
          )}
        >
          [DIAGNOSTIC TRACE SCAN]
        </span>
        <span className="text-zinc-300 text-xs">
          DECLARED:{' '}
          <strong className="text-amber-400 font-bold px-1.5 py-0.5 bg-amber-950/80 rounded border border-amber-800">
            {declaredProtocol}
          </strong>
        </span>
      </div>

      {/* Isometric 3D Stage with Motion Card Flips */}
      <div className="flex gap-2.5 justify-center items-center py-1.5" style={{ perspective: '1200px' }}>
        {revealedCards.map((card, idx) => {
          const isFlipped = idx < flippedCount;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20, rotateX: 30 }}
              animate={{
                opacity: 1,
                y: isFlipped ? -4 : 0,
                rotateX: 0,
                rotateY: isFlipped ? 180 : 0,
                scale: isFlipped ? 1.05 : 1,
              }}
              transition={{
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="relative"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Back Face (Visible before flip) */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                <PcbCard faceDown size="md" hoverable={false} />
              </div>

              {/* Front Face (Visible after 180deg flip) */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <PcbCard
                  id={card.id}
                  protocol={card.protocol}
                  visualSeed={card.visualSeed}
                  size="md"
                  hoverable={false}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Verdict Banner with Impact Animation */}
      <AnimatePresence>
        {showVerdict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className={clsx(
              'mt-6 px-6 py-3.5 rounded-xl text-center border-2 transition-all w-full',
              bluffDetected
                ? 'bg-red-950/95 border-red-500 text-red-100 shadow-[0_0_35px_rgba(239,68,68,0.6)]'
                : 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-[0_0_35px_rgba(16,185,129,0.6)]'
            )}
          >
            <div className="font-black text-base tracking-widest flex items-center justify-center gap-2">
              <span>{bluffDetected ? '⚡ HIGH VOLTAGE OVERLOAD // BLUFF DETECTED!' : '🛡 INTEGRITY VERIFIED // AUTHENTIC HARDWARE!'}</span>
            </div>
            <div className="text-xs text-zinc-300 mt-1.5 font-medium">
              {bluffDetected
                ? `Operator [${accusedNickname}] transmitted corrupt packets and failed integrity check!`
                : `Accuser [${accuserNickname}] triggered false alarm and absorbs high voltage discharge!`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
