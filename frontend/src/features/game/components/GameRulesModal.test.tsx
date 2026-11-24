import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GameRulesModal } from './GameRulesModal';

describe('GameRulesModal Component', () => {
  it('renders nothing when closed', () => {
    const html = renderToString(
      React.createElement(GameRulesModal, {
        isOpen: false,
        onClose: () => {},
      })
    );
    expect(html).toBe('');
  });

  it('renders game rules, objectives and steps when open', () => {
    const html = renderToString(
      React.createElement(GameRulesModal, {
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(html).toContain('ZASADY GRY // OVERVOLT');
    expect(html).toContain('1. Cel rozgrywki');
    expect(html).toContain('4. Sprawdzenie blefu');
    expect(html).toContain('Karty Specjalne w Talii');
    expect(html).toContain('GLITCH');
    expect(html).toContain('CORRUPTED');
    expect(html).toContain('SN74-SNIFF');
    expect(html).toContain('ZAMKNIJ PRZEWODNIK');
  });
});
