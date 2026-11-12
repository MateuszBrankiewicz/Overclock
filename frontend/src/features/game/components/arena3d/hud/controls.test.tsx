import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { getCharacterById } from '../../../utils/characterCatalog';
import { ActionStrip } from './ActionStrip';
import { classifyCard } from './cardMarks';
import { DiceRoll } from './DiceRoll';
import { buildDiceSequence } from './diceRoll';
import { INITIAL_FIRST_TURN_HINT, nextFirstTurnHint } from './firstTurnHint';
import { resolveHotkey } from './hotkeys';

const ctx = { canTransmit: true, canTrace: true, canUseChip: true, handSize: 5 };

describe('resolveHotkey', () => {
  it('maps digits to hand indices within the hand size', () => {
    expect(resolveHotkey({ key: '1' }, ctx)).toEqual({ type: 'toggleCard', index: 0 });
    expect(resolveHotkey({ key: '5' }, ctx)).toEqual({ type: 'toggleCard', index: 4 });
    expect(resolveHotkey({ key: '6' }, ctx)).toBeNull();
  });

  it('maps action keys when enabled', () => {
    expect(resolveHotkey({ key: 'Enter' }, ctx)).toEqual({ type: 'transmit' });
    expect(resolveHotkey({ key: ' ' }, ctx)).toEqual({ type: 'transmit' });
    expect(resolveHotkey({ key: 't' }, ctx)).toEqual({ type: 'trace' });
    expect(resolveHotkey({ key: 'E' }, ctx)).toEqual({ type: 'chip' });
    expect(resolveHotkey({ key: 'Escape' }, ctx)).toEqual({ type: 'escape' });
    expect(resolveHotkey({ key: '?' }, ctx)).toEqual({ type: 'toggleHelp' });
  });

  it('respects the same disabled conditions as the buttons', () => {
    const off = { ...ctx, canTransmit: false, canTrace: false, canUseChip: false };
    expect(resolveHotkey({ key: 'Enter' }, off)).toBeNull();
    expect(resolveHotkey({ key: 't' }, off)).toBeNull();
    expect(resolveHotkey({ key: 'e' }, off)).toBeNull();
  });

  it('ignores typing in inputs and modifier combos', () => {
    expect(resolveHotkey({ key: '1', targetTag: 'INPUT' }, ctx)).toBeNull();
    expect(resolveHotkey({ key: 't', targetTag: 'textarea' }, ctx)).toBeNull();
    expect(resolveHotkey({ key: 't', targetEditable: true }, ctx)).toBeNull();
    expect(resolveHotkey({ key: 't', ctrlKey: true }, ctx)).toBeNull();
    expect(resolveHotkey({ key: 'Enter', metaKey: true }, ctx)).toBeNull();
    expect(resolveHotkey({ key: 't', altKey: true }, ctx)).toBeNull();
  });

  it('does not repeat actions while a key is held', () => {
    expect(resolveHotkey({ key: 'Enter', repeat: true }, ctx)).toBeNull();
  });
});

describe('dice roll', () => {
  it('always lands on the rolled face without back-to-back repeats', () => {
    for (let roll = 1; roll <= 6; roll++) {
      const seq = buildDiceSequence(roll);
      expect(seq[seq.length - 1]).toBe(roll);
      expect(seq.every((f) => f >= 1 && f <= 6)).toBe(true);
      for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });

  it('shows the result immediately under reduced motion', () => {
    const html = renderToString(<DiceRoll roll={4} overloaded={false} reducedMotion />);
    expect(html).toContain('data-face="4"');
  });
});

describe('first-turn hint', () => {
  it('shows once on the first own turn and not again in the same match', () => {
    let s = nextFirstTurnHint(INITIAL_FIRST_TURN_HINT, { isMyTurn: true, roomState: 'TurnActive' });
    expect(s.visible).toBe(true);
    s = nextFirstTurnHint(s, { isMyTurn: false, roomState: 'TurnActive' });
    expect(s.visible).toBe(false);
    s = nextFirstTurnHint(s, { isMyTurn: true, roomState: 'TurnActive' });
    expect(s.visible).toBe(false);
  });

  it('re-arms for the next match', () => {
    let s = nextFirstTurnHint(INITIAL_FIRST_TURN_HINT, { isMyTurn: true, roomState: 'TurnActive' });
    s = nextFirstTurnHint(s, { isMyTurn: false, roomState: 'GameOver' });
    expect(s).toEqual(INITIAL_FIRST_TURN_HINT);
    expect(nextFirstTurnHint(s, { isMyTurn: true, roomState: 'TurnActive' }).visible).toBe(true);
  });
});

describe('card marks', () => {
  it('classifies match / wild / bluff', () => {
    expect(classifyCard('Alpha', 'Alpha')).toBe('match');
    expect(classifyCard('Beta', 'Alpha')).toBe('bluff');
    expect(classifyCard('Glitch', 'Alpha')).toBe('wild');
    expect(classifyCard('Corrupted', 'Alpha')).toBe('bluff');
    expect(classifyCard('Corrupted', null)).toBe('bluff');
    expect(classifyCard('Gamma', null)).toBe('match');
  });
});

describe('action strip key hints', () => {
  const props = {
    canTrace: true,
    canTransmit: true,
    canUseChip: true,
    exploit: { type: 'EmpFlare' as const, isBurned: false },
    riskLevel: 1,
    myCharacter: getCharacterById('ghost'),
    selectedCount: 1,
    currentTargetProtocol: null,
    picker: { isOpen: false, request: () => {}, pick: () => {}, close: () => {} },
    onCallTrace: () => {},
    onPlayCards: () => {},
  };
  it('renders hints only when requested', () => {
    expect(renderToString(<ActionStrip {...props} />)).not.toContain('key-hint');
    const html = renderToString(<ActionStrip {...props} showKeyHints />);
    expect(html).toContain('[T]');
    expect(html).toContain('[E]');
    expect(html).toContain('[↵]');
  });
});
