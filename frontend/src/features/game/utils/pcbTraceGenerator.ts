export interface PcbTraceLayout {
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  vias: Array<{ cx: number; cy: number; r: number }>;
  buses: Array<{ d: string }>;
}

export function generatePcbTraces(seed: number): PcbTraceLayout {
  // LCG pseudo-random generator seeded deterministically
  let state = (seed ^ 0x5deece66) >>> 0;
  const nextRandom = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state >>> 0) / 4294967296;
  };

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const vias: Array<{ cx: number; cy: number; r: number }> = [];
  const buses: Array<{ d: string }> = [];

  // Generate 4-6 deterministic traces across the card (viewBox: 0 0 100 140)
  const traceCount = 4 + Math.floor(nextRandom() * 3);
  for (let i = 0; i < traceCount; i++) {
    const startX = 10 + Math.floor(nextRandom() * 80);
    const startY = 15 + Math.floor(nextRandom() * 30);
    const midY = startY + 20 + Math.floor(nextRandom() * 40);
    const endX = 10 + Math.floor(nextRandom() * 80);
    const endY = 110 + Math.floor(nextRandom() * 20);

    // Diagonal dogleg routing standard in PCB trace design
    buses.push({
      d: `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY + 10} L ${endX} ${endY}`,
    });

    // Via at turning point
    vias.push({
      cx: startX,
      cy: startY,
      r: 1.8,
    });
    vias.push({
      cx: endX,
      cy: endY,
      r: 1.8,
    });
  }

  // Horizontal ground/bus trace
  const busY = 30 + Math.floor(nextRandom() * 60);
  lines.push({ x1: 8, y1: busY, x2: 92, y2: busY });

  return { lines, vias, buses };
}

