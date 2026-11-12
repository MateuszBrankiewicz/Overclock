import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RoundIntroBanner } from './RoundIntroBanner';

describe('RoundIntroBanner', () => {
  it('announces the round number and its protocol', () => {
    const html = renderToString(
      React.createElement(RoundIntroBanner, {
        roundNumber: 4,
        protocol: 'Beta',
        startedAtMs: Date.now(),
        onDone: () => {},
      })
    );
    expect(html).toContain('round-intro-banner');
    expect(html).toMatch(/ROUND 4|RUNDA 4/);
    expect(html).toContain('BETA');
  });

  it('omits the protocol block when the server sent none', () => {
    const html = renderToString(
      React.createElement(RoundIntroBanner, {
        roundNumber: 1,
        protocol: null,
        startedAtMs: Date.now(),
        onDone: () => {},
      })
    );
    expect(html).not.toContain('round-intro-protocol');
  });
});
