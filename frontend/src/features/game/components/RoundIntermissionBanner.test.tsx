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
      })
    );

    expect(html).toContain('GhostOperator');
    expect(html).toContain('round-intermission-banner');
    expect(html).toContain('intermission-waiting');
  });

  it('renders countdown anchored to authoritative intermissionDeadlineUtc and announces upcoming round in final second', () => {
    const finalSecondDeadline = new Date(Date.now() + 1000).toISOString();
    const html = renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 3,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: null,
        isHost: true,
        isDischargeCinematicActive: false,
        intermissionDeadlineUtc: finalSecondDeadline,
      })
    );
    expect(html).toContain('intermission-countdown');
    expect(html).toMatch(/ROUND 4|RUNDA 4/);
  });

  it('renders countdown anchored to authoritative intermissionDeadlineUtc', () => {
    const futureDeadline = new Date(Date.now() + 7000).toISOString();
    const html = renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 3,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: null,
        isHost: true,
        isDischargeCinematicActive: false,
        intermissionDeadlineUtc: futureDeadline,
      })
    );
    expect(html).toContain('intermission-countdown');
    expect(html).toContain('7');
  });

  it('never invokes onStartNextRound automatically when countdown expires', () => {
    const onStartNextRound = vi.fn();
    const pastDeadline = new Date(Date.now() - 1000).toISOString();

    renderToString(
      React.createElement(RoundIntermissionBanner, {
        roundNumber: 3,
        players: [
          { playerId: 'p1', nickname: 'GhostOperator', status: 'Active', isReady: true, handCount: 2, riskLevel: 1 },
        ],
        lastDischargeOutcome: null,
        isHost: true,
        isDischargeCinematicActive: false,
        intermissionDeadlineUtc: pastDeadline,
        onStartNextRound,
      })
    );

    vi.advanceTimersByTime(5000);
    expect(onStartNextRound).not.toHaveBeenCalled();
  });
});
