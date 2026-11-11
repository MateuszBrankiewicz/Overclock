import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CHARACTER_CATALOG,
  getCharacterById,
  resolveSeatCharacter,
} from '../utils/characterCatalog';
import { CharacterSelector } from './CharacterSelector';

describe('CharacterSelector & Character Catalog (ADR 0010)', () => {
  it('renders all four Cyber-Rig operator archetypes', () => {
    const html = renderToString(
      React.createElement(CharacterSelector, {
        selectedId: 'volt',
        onSelect: () => {},
      })
    );

    expect(html).toContain('GHOST-01');
    expect(html).toContain('VOLT-9');
    expect(html).toContain('PROXY-X');
    expect(html).toContain('NULL-404');
  });

  it('resolves local player character and deterministic distinct opponent characters', () => {
    expect(CHARACTER_CATALOG).toHaveLength(4);
    expect(getCharacterById('proxy').codename).toBe('PROXY-X');

    const myChar = resolveSeatCharacter('p1', 'p1', 'volt', 0);
    expect(myChar.id).toBe('volt');

    const oppChar = resolveSeatCharacter('p2-uuid', 'p1', 'volt', 1);
    expect(oppChar.id).not.toBe('volt');
  });
});
