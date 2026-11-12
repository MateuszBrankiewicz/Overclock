import { useEffect, useState } from 'react';

export const YOUR_TURN_BANNER_MS = 1200;

/** Pure transition check: banner fires when the local player newly becomes active. */
export function becameMyTurn(wasMyTurn: boolean, isMyTurn: boolean): boolean {
  return !wasMyTurn && isMyTurn;
}

/** True for ~1.2 s each time `isMyTurn` flips from false to true. */
export function useYourTurnBanner(isMyTurn: boolean): boolean {
  const [wasMyTurn, setWasMyTurn] = useState(false);
  const [visible, setVisible] = useState(false);

  if (wasMyTurn !== isMyTurn) {
    setWasMyTurn(isMyTurn);
    setVisible(becameMyTurn(wasMyTurn, isMyTurn));
  }

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), YOUR_TURN_BANNER_MS);
    return () => clearTimeout(id);
  }, [visible]);

  return isMyTurn && visible;
}
