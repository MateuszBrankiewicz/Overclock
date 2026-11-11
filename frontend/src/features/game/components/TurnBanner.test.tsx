import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TurnBanner } from './TurnBanner';

describe('TurnBanner Component', () => {
  it('renders your turn banner with glowing help text', () => {
    const html = renderToString(
      React.createElement(TurnBanner, {
        isMyTurn: true,
        currentTargetProtocol: 'Beta',
      })
    );

    expect(html).toContain('TWÓJ RUCH');
    expect(html).toContain('Beta');
  });

  it('renders opponent turn when not my turn', () => {
    const html = renderToString(
      React.createElement(TurnBanner, {
        isMyTurn: false,
        activePlayerNickname: 'NEO-OPERATOR',
        currentTargetProtocol: 'Gamma',
      })
    );

    expect(html).toContain('Ruch gracza');
    expect(html).toContain('NEO-OPERATOR');
    expect(html).toContain('Gamma');
  });

  it('renders diagnostic error log when present', () => {
    const html = renderToString(
      React.createElement(TurnBanner, {
        isMyTurn: false,
        currentTargetProtocol: 'Alpha',
        lastLog: 'Failed to execute call trace: round not active',
      })
    );

    expect(html).toContain('Failed to execute call trace: round not active');
  });

  it('renders spectator alert when eliminated', () => {
    const html = renderToString(
      React.createElement(TurnBanner, {
        isMyTurn: false,
        currentTargetProtocol: 'Alpha',
        isEliminated: true,
      })
    );

    expect(html).toContain('TRYB OBSERWATORA');
  });
});
