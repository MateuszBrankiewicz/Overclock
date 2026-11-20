import { useCallback, useMemo } from 'react';

import type { PlayerSeat } from '../../schemas/gameEvents';

export type Vec3 = [number, number, number];

export interface SeatLayout {
  position: Vec3;
  rotationY: number;
}

export function computeOpponentSeatLayout(count: number): SeatLayout[] {
  if (count <= 1) {
    return [{ position: [0, 0, -2.4], rotationY: 0 }];
  }
  if (count === 2) {
    return [
      { position: [-1.55, 0, -1.95], rotationY: Math.PI / 4.5 },
      { position: [1.55, 0, -1.95], rotationY: -Math.PI / 4.5 },
    ];
  }
  return [
    { position: [-1.85, 0, -1.45], rotationY: Math.PI / 3.4 },
    { position: [0, 0, -2.45], rotationY: 0 },
    { position: [1.85, 0, -1.45], rotationY: -Math.PI / 3.4 },
  ];
}

/** Where the opponents sit around the table and the anchor points effects aim at. */
export function useArenaSeats(players: PlayerSeat[], myPlayerId: string | null) {
  const opponents = useMemo(
    () => players.filter((p) => p.playerId !== myPlayerId),
    [players, myPlayerId]
  );
  const seatLayouts = useMemo(
    () => computeOpponentSeatLayout(opponents.length),
    [opponents.length]
  );

  /** Head height above an operator's seat, used to aim reveal effects at a player. */
  const seatHeadPos = useCallback(
    (playerId: string): Vec3 => {
      if (playerId === myPlayerId) return [0, 1.35, 1.8];
      const oppIdx = opponents.findIndex((o) => o.playerId === playerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        const p = seatLayouts[oppIdx].position;
        return [p[0], 1.35, p[2]];
      }
      return [0, 1.35, -2.4];
    },
    [myPlayerId, opponents, seatLayouts]
  );

  /** Chest of an operator, where the voltage-test leads clamp on. */
  const seatChestPos = useCallback(
    (playerId: string): Vec3 => {
      if (playerId === myPlayerId) return [0, 1.0, 1.85];
      const oppIdx = opponents.findIndex((o) => o.playerId === playerId);
      if (oppIdx >= 0 && seatLayouts[oppIdx]) {
        const [x, , z] = seatLayouts[oppIdx].position;
        const r = Math.hypot(x, z);
        const k = r > 0.1 ? (r - 0.1) / r : 1;
        return [x * k, 1.15, z * k];
      }
      return [0, 1.15, -2.3];
    },
    [myPlayerId, opponents, seatLayouts]
  );

  return { opponents, seatLayouts, seatHeadPos, seatChestPos };
}
