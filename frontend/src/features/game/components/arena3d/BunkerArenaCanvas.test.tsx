import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BunkerArenaCanvas } from './BunkerArenaCanvas';

describe('BunkerArenaCanvas Component (ADR 0010 Diegetic 3D Arena)', () => {
  it('renders bunker arena stage and overlay children during outcome cinematic', () => {
    const html = renderToString(
      React.createElement(
        BunkerArenaCanvas,
        {
          players: [
            {
              playerId: 'p1',
              nickname: 'LocalPilot',
              status: 'Active',
              isReady: true,
              handCount: 3,
              riskLevel: 2,
            },
          ],
          myPlayerId: 'p1',
          activePlayerId: 'p1',
          pendingDischargePlayerId: 'p1',
          selectedCharacterId: 'ghost',
          tablePileCount: 2,
          currentTargetProtocol: 'Alpha',
          roomState: 'VoltageTest',
          lastPlayedCards: null,
          cameraFocus: 'overview',
          onCameraFocusChange: () => {},
          isOutcomeCinematic: true,
        },
        React.createElement('div', null, 'ShowdownOverlay')
      )
    );

    expect(html).toContain('bunker-arena-stage');
    expect(html).toContain('ShowdownOverlay');
  });

  it('renders accessible live telemetry region during dielectric discharge cinematic', () => {
    const html = renderToString(
      React.createElement(BunkerArenaCanvas, {
        players: [
          {
            playerId: 'p1',
            nickname: 'LocalPilot',
            status: 'Active',
            isReady: true,
            handCount: 3,
            riskLevel: 2,
          },
        ],
        myPlayerId: 'p1',
        activePlayerId: 'p1',
        pendingDischargePlayerId: null,
        selectedCharacterId: 'ghost',
        tablePileCount: 0,
        currentTargetProtocol: 'Alpha',
        roomState: 'TurnActive',
        lastPlayedCards: null,
        cameraFocus: 'overview',
        onCameraFocusChange: () => {},
        dischargeCinematic: {
          event: {
            type: 'CapacitorDischarged',
            roomCode: 'CYBER-7X9',
            playerId: 'p1',
            roll: 1,
            riskLevel: 3,
            resultingRiskLevel: 3,
            overloaded: true,
          },
          startedAtMs: Date.now(),
        },
      })
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('1');
    expect(html).toContain('3');
  });
});
