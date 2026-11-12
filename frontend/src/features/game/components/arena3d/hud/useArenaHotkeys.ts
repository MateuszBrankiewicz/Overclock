import { useEffect, useRef, useState } from 'react';

import type { ExploitModule } from '../../../schemas/gameEvents';
import { type HotkeyContext, resolveHotkey } from './hotkeys';
import type { ExploitPicker } from './useExploitPicker';

export interface ArenaHotkeysOptions extends Omit<HotkeyContext, 'handSize'> {
  enabled: boolean;
  cardIds: string[];
  selectedCardIds: string[];
  exploit: ExploitModule | null;
  picker: ExploitPicker;
  onToggleCard: (cardId: string) => void;
  onPlayCards: () => void;
  onCallTrace: () => void;
}

/** Wires window key events to arena actions (mapping lives in `resolveHotkey`). */
export function useArenaHotkeys(options: ArenaHotkeysOptions): {
  helpOpen: boolean;
  closeHelp: () => void;
} {
  const [helpOpen, setHelpOpen] = useState(false);
  const optionsRef = useRef(options);
  const helpRef = useRef(helpOpen);
  useEffect(() => {
    optionsRef.current = options;
    helpRef.current = helpOpen;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const o = optionsRef.current;
      if (!o.enabled) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      const action = resolveHotkey(
        {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          repeat: e.repeat,
          targetTag: el?.tagName ?? null,
          targetEditable: el?.isContentEditable ?? false,
        },
        {
          canTransmit: o.canTransmit,
          canTrace: o.canTrace,
          canUseChip: o.canUseChip,
          handSize: o.cardIds.length,
        }
      );
      if (!action) return;
      e.preventDefault();
      switch (action.type) {
        case 'toggleCard':
          o.onToggleCard(o.cardIds[action.index]);
          break;
        case 'transmit':
          o.onPlayCards();
          break;
        case 'trace':
          o.onCallTrace();
          break;
        case 'chip':
          if (o.exploit) o.picker.request(o.exploit.type);
          break;
        case 'toggleHelp':
          setHelpOpen((v) => !v);
          break;
        case 'escape':
          if (helpRef.current) setHelpOpen(false);
          else if (o.picker.isOpen) o.picker.close();
          else o.selectedCardIds.forEach((id) => o.onToggleCard(id));
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { helpOpen, closeHelp: () => setHelpOpen(false) };
}
