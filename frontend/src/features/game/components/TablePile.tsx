import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo } from 'react';

import { PcbCard } from './PcbCard';

export interface TablePileProps {
  cardCount: number;
  lastPlayedCount?: number;
  isFlying?: boolean;
}

export const TablePile: React.FC<TablePileProps> = ({
  cardCount,
  lastPlayedCount = 0,
  isFlying = false,
}) => {
  // Generate deterministic isometric rotations & offsets for realistic 3D packet stacking
  const stackItems = useMemo(() => {
    const list: Array<{ rot: number; offsetX: number; offsetY: number; z: number }> = [];
    const count = Math.min(cardCount, 10);
    for (let i = 0; i < count; i++) {
      const rot = ((i * 43) % 15) - 7;
      const offsetX = ((i * 17) % 9) - 4;
      const offsetY = i * -3;
      list.push({ rot, offsetX, offsetY, z: i * 4 });
    }
    return list;
  }, [cardCount]);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 min-h-[260px] w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] text-zinc-400 font-mono tracking-widest mb-4 flex items-center gap-2 bg-black/80 px-3 py-1 rounded-full border border-zinc-800"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        CENTRAL BUS STACK // {cardCount} {cardCount === 1 ? 'PACKET' : 'PACKETS'} BUFFERED
      </motion.div>

      <div
        className="relative w-28 h-40 flex items-center justify-center"
        style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
      >
        {cardCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-28 h-40 rounded-lg border-2 border-dashed border-zinc-800/80 bg-zinc-950/60 flex flex-col items-center justify-center text-[10px] text-zinc-600 font-mono text-center p-3 shadow-inner"
          >
            <span className="text-zinc-500 font-bold mb-1">BUS EMPTY</span>
            <span>AWAITING FIRST PACKET</span>
          </motion.div>
        ) : (
          stackItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 1.15, opacity: 0, y: -20 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: item.offsetX,
                y: item.offsetY,
                rotate: item.rot,
                z: item.z,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
              }}
              className="absolute"
              style={{
                zIndex: idx + 1,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.9)',
              }}
            >
              <PcbCard faceDown size="md" hoverable={false} />
            </motion.div>
          ))
        )}

        {/* Dynamic Flight Animation using Motion */}
        <AnimatePresence>
          {isFlying && (
            <motion.div
              initial={{ opacity: 0, y: 150, scale: 0.6, rotateX: 45 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-50 pointer-events-none"
            >
              <div className="flex gap-2">
                {Array.from({ length: Math.max(1, Math.min(3, lastPlayedCount)) }).map((_, i) => (
                  <PcbCard
                    key={i}
                    faceDown
                    size="md"
                    hoverable={false}
                    className="shadow-[0_0_35px_rgba(16,185,129,0.8)]"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
