export type HotkeyAction =
  | { type: 'toggleCard'; index: number }
  | { type: 'transmit' }
  | { type: 'trace' }
  | { type: 'chip' }
  | { type: 'escape' }
  | { type: 'toggleHelp' };

export interface HotkeyContext {
  canTransmit: boolean;
  canTrace: boolean;
  canUseChip: boolean;
  handSize: number;
}

export interface HotkeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  /** Tag name of the focused element, if any. */
  targetTag?: string | null;
  targetEditable?: boolean;
}

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Focused controls that already react to Enter/Space themselves. */
const ACTIVATABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

/** Pure key -> action mapping; returns null when the key must be left alone. */
export function resolveHotkey(e: HotkeyEventLike, ctx: HotkeyContext): HotkeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.targetEditable || (e.targetTag && TEXT_TAGS.has(e.targetTag.toUpperCase()))) return null;

  if (/^[1-9]$/.test(e.key)) {
    const index = Number(e.key) - 1;
    return index < ctx.handSize ? { type: 'toggleCard', index } : null;
  }
  switch (e.key) {
    case 'Enter':
    case ' ':
      if (e.targetTag && ACTIVATABLE_TAGS.has(e.targetTag.toUpperCase())) return null;
      return ctx.canTransmit && !e.repeat ? { type: 'transmit' } : null;
    case 't':
    case 'T':
      return ctx.canTrace && !e.repeat ? { type: 'trace' } : null;
    case 'e':
    case 'E':
      return ctx.canUseChip && !e.repeat ? { type: 'chip' } : null;
    case 'Escape':
      return { type: 'escape' };
    case '?':
      return { type: 'toggleHelp' };
    default:
      return null;
  }
}
