import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VoltageTestSequence } from './VoltageTestSequence';

describe('VoltageTestSequence Component (TASK-2.6)', () => {
  it('is exported as a React functional component', () => {
    expect(VoltageTestSequence).toBeDefined();
    expect(typeof VoltageTestSequence).toBe('function');
  });

  it('renders nothing when test is inactive and no outcome exists', () => {
    const html = renderToString(
      React.createElement(VoltageTestSequence, {
        isVoltageTestActive: false,
        lastDischargeOutcome: null,
      })
    );
    expect(html).toBe('');
  });

  it('renders pending test sequence with target operator and action buttons', () => {
    const html = renderToString(
      React.createElement(VoltageTestSequence, {
        isVoltageTestActive: true,
        pendingPlayerNickname: 'CYBER-ACE',
        isLocalPlayerPending: true,
        canUseGroundWire: true,
        onDeployGroundWire: () => {},
        onTriggerDischarge: () => {},
      })
    );

    expect(html).toContain('HIGH-VOLTAGE CAPACITOR TEST');
    expect(html).toContain('CYBER-ACE');
    expect(html).toContain('TRIGGER DISCHARGE NOW');
    expect(html).toContain('DEPLOY GROUND WIRE');
  });

  it('renders survived discharge outcome', () => {
    const html = renderToString(
      React.createElement(VoltageTestSequence, {
        isVoltageTestActive: false,
        lastDischargeOutcome: {
          type: 'CapacitorDischarged',
          roomCode: 'CYBER-1',
          playerId: 'player-1',
          roll: 5,
          riskLevel: 2,
          resultingRiskLevel: 3,
          overloaded: false,
        },
      })
    );

    expect(html).toContain('DIELECTRIC DISCHARGE COMPLETE');
    expect(html).toContain('D6 ROLL RESULT');
    expect(html).toContain('5');
    expect(html).toContain('DIELECTRIC HELD: SYSTEM STABILIZED');
  });

  it('renders critical overload and elimination banner', () => {
    const html = renderToString(
      React.createElement(VoltageTestSequence, {
        isVoltageTestActive: false,
        lastDischargeOutcome: {
          type: 'CapacitorDischarged',
          roomCode: 'CYBER-1',
          playerId: 'player-1',
          roll: 1,
          riskLevel: 3,
          resultingRiskLevel: 3,
          overloaded: true,
        },
      })
    );

    expect(html).toContain('CRITICAL VOLTAGE OVERLOAD');
    expect(html).toContain('CRITICAL OVERLOAD: DIELECTRIC BREAKDOWN DETECTED!');
    expect(html).toContain('Target operator eliminated from the circuit.');
  });
});
