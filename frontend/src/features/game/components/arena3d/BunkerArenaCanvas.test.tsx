import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BunkerArenaCanvas } from './BunkerArenaCanvas';

describe('BunkerArenaCanvas Component (ADR 0010 Diegetic 3D Arena)', () => {
  it('renders tactile voltage test trigger button when local player is pending discharge', () => {
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
        pendingDischargePlayerId: 'p1',
        selectedCharacterId: 'ghost',
        tablePileCount: 2,
        currentTargetProtocol: 'Alpha',
        roomState: 'VoltageTest',
        lastPlayedCards: null,
        cameraFocus: 'overview',
        onCameraFocusChange: () => {},
        isVoltageTestActive: true,
        isLocalPlayerPending: true,
        canUseGroundWire: true,
        onDeployGroundWire: () => {},
        onTriggerDischarge: () => {},
      })
    );

    // Tactile action controls must be rendered diegetically without blocking 2D modals
    expect(html).toContain('D6');
    expect(html).toContain('bunker-arena-stage');
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
