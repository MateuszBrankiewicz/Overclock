import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoundIntermissionBanner } from './RoundIntermissionBanner';

describe('RoundIntermissionBanner Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders survived round outcome with resulting risk level', () => {
    const html = renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 1,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Active', isReady: true, handCount: 2, riskLevel: 2 },
          { playerId: 'p2', nickname: 'RivalRig', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: {
          type: 'CapacitorDischarged',
          roomCode: 'CYBER-7X9',
          playerId: 'p1',
          roll: 5,
          riskLevel: 1,
          resultingRiskLevel: 2,
          overloaded: false,
        },
        isHost: true,
        isDischargeCinematicActive: false,
        onStartNextRound: () => {},
      })
    );

    expect(html).toContain('GhostOperator');
    expect(html).toContain('2/6');
    expect(html).toContain('round-intermission-banner');
  });

  it('renders eliminated round outcome when operator suffered dielectric breakdown', () => {
    const html = renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 2,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Eliminated', isReady: true, handCount: 0, riskLevel: 3 },
          { playerId: 'p2', nickname: 'RivalRig', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: {
          type: 'CapacitorDischarged',
          roomCode: 'CYBER-7X9',
          playerId: 'p1',
          roll: 1,
          riskLevel: 3,
          resultingRiskLevel: 3,
          overloaded: true,
        },
        isHost: true,
        isDischargeCinematicActive: false,
        onStartNextRound: () => {},
      })
    );

    expect(html).toContain('GhostOperator');
    expect(html).toContain('round-intermission-banner');
    expect(html).toContain('intermission-countdown');
  });

  it('renders intermission-countdown when cinematic is not active', () => {
    const html = renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 3,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: null,
        isHost: true,
        isDischargeCinematicActive: false,
        onStartNextRound: () => {},
      })
    );
    expect(html).toContain('intermission-countdown');
  });
});
