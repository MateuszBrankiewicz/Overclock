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

  it('resolves character by id with fallback to default', () => {
    expect(CHARACTER_CATALOG).toHaveLength(4);
    expect(getCharacterById('proxy').codename).toBe('PROXY-X');

    const charVolt = resolveSeatCharacter('volt');
    expect(charVolt.id).toBe('volt');

    const charProxy = resolveSeatCharacter('proxy');
    expect(charProxy.id).toBe('proxy');

    const unknownChar = resolveSeatCharacter('unknown-rig');
    expect(unknownChar.id).toBe('ghost');

    const missingChar = resolveSeatCharacter(null, 'null');
    expect(missingChar.id).toBe('null');
  });

  it('renders taken character indicator and disables taken character buttons', () => {
    const html = renderToString(
      React.createElement(CharacterSelector, {
        selectedId: 'volt',
        onSelect: () => {},
        takenByCharacterId: { proxy: 'CyberAlice' },
      })
    );

    expect(html).toContain('CyberAlice');
    expect(html).toContain('select-character-proxy');
  });
});
