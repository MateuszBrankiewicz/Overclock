import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CapacitorDischargedEvent,
  PlayerEliminatedEvent,
  PlayerSeat,
  RoomStateSnapshot,
  TraceResolution,
  VoltageTestStartedEvent,
} from '../schemas/gameEvents';
import { useGameStore } from '../stores/useGameStore';
import { OperatingTable } from './OperatingTable';

// In Node.js SSR (renderToString), React 19's useSyncExternalStore calls getServerSnapshot (api.getInitialState).
// Mock useSyncExternalStore to evaluate getSnapshot (api.getState) so SSR renders the live Zustand store state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
  (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
);

const ME_ID = '11111111-1111-4111-8111-111111111111';
const RIVAL_ID = '22222222-2222-4222-8222-222222222222';

const createSeats = (rivalGroundWire = false): PlayerSeat[] => [
  {
    playerId: ME_ID,
    nickname: 'MeOperator',
    status: 'Active',
    isReady: true,
    handCount: 3,
    riskLevel: 1,
    characterId: 'ghost',
  },
  {
    playerId: RIVAL_ID,
    nickname: 'RivalRig',
    status: 'Active',
    isReady: true,
    handCount: 3,
    riskLevel: 1,
    characterId: 'volt',
    exploit: rivalGroundWire
      ? { type: 'GroundWire', isBurned: false }
      : null,
  },
];

const createActiveSnapshot = (rivalGroundWire = false): RoomStateSnapshot => ({
  roomCode: 'CYBER-7X9',
  state: 'TurnActive',
  hostId: ME_ID,
  myPlayerId: ME_ID,
  myHand: [
    { id: 'card-1', protocol: 'Alpha', visualSeed: 1 },
    { id: 'card-2', protocol: 'Beta', visualSeed: 2 },
  ],
  seats: createSeats(rivalGroundWire),
  tablePileCount: 2,
  currentTargetProtocol: 'Alpha',
  currentTurnPlayerId: ME_ID,
  roundNumber: 1,
});

describe('OperatingTable Bluff Check Sequence E2E Component Tests', () => {
  beforeEach(() => {
    useGameStore.getState().leaveRoom();
    useGameStore.getState().setSelectedCharacter('ghost');
  });

  it('Scenario 1: Non-lethal Bluff Check (RoundOver) — zero premature intermission banner', () => {
    // 0. Initial Active Turn State
    useGameStore.getState().applyRoomSnapshot(createActiveSnapshot());
    let html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 1. Trace Called — 3D card reveal starts
    const resolution: TraceResolution = {
      accuserPlayerId: ME_ID,
      accusedPlayerId: RIVAL_ID,
      loserPlayerId: RIVAL_ID,
      revealedCards: [{ id: 'rev-1', protocol: 'Corrupted', visualSeed: 9 }],
      declaredProtocol: 'Alpha',
      bluffDetected: true,
      sequenceNumber: 10,
    };
    useGameStore.getState().applyTraceResolution(resolution);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 2. CapacitorDischarged event arrives from backend while cards are flipping
    const discharged: CapacitorDischargedEvent = {
      type: 'CapacitorDischarged',
      roomCode: 'CYBER-7X9',
      playerId: RIVAL_ID,
      roll: 5,
      riskLevel: 1,
      resultingRiskLevel: 2,
      overloaded: false,
      sequenceNumber: 11,
    };
    useGameStore.getState().applyCapacitorDischarged(discharged);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 3. Room snapshot with state 'RoundOver' arrives while card reveal is still playing
    useGameStore.getState().applyRoomSnapshot({
      ...createActiveSnapshot(),
      state: 'RoundOver',
      lastTraceResolution: resolution,
      sequenceNumber: 12,
    });

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 4. Card reveal completes — discharge cinematic starts
    useGameStore.getState().finishTraceReveal();
    expect(useGameStore.getState().dischargeCinematic).not.toBeNull();

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 5. Discharge cinematic completes — ONLY NOW does RoundIntermissionBanner appear!
    useGameStore.getState().clearDischargeCinematic();

    html = renderToString(React.createElement(OperatingTable));
    expect(html).toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');
  });

  it('Scenario 2: Fatal Bluff Check (GameOver) — zero premature MatchSummary popup', () => {
    // 0. Initial Active Turn State
    useGameStore.getState().applyRoomSnapshot(createActiveSnapshot());
    let html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 1. Trace Called — Accuser catches bluff
    const resolution: TraceResolution = {
      accuserPlayerId: ME_ID,
      accusedPlayerId: RIVAL_ID,
      loserPlayerId: RIVAL_ID,
      revealedCards: [{ id: 'rev-2', protocol: 'Corrupted', visualSeed: 3 }],
      declaredProtocol: 'Alpha',
      bluffDetected: true,
      sequenceNumber: 20,
    };
    useGameStore.getState().applyTraceResolution(resolution);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 2. Fatal discharge event arrives (overloaded: true)
    const fatalDischarge: CapacitorDischargedEvent = {
      type: 'CapacitorDischarged',
      roomCode: 'CYBER-7X9',
      playerId: RIVAL_ID,
      roll: 1,
      riskLevel: 1,
      resultingRiskLevel: 1,
      overloaded: true,
      sequenceNumber: 21,
    };
    useGameStore.getState().applyCapacitorDischarged(fatalDischarge);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 3. PlayerEliminated event arrives
    const eliminated: PlayerEliminatedEvent = {
      type: 'PlayerEliminated',
      roomCode: 'CYBER-7X9',
      playerId: RIVAL_ID,
      placement: 2,
      sequenceNumber: 22,
    };
    useGameStore.getState().applyPlayerEliminated(eliminated);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 4. Room snapshot with state 'GameOver' arrives while cards are still flipping
    useGameStore.getState().applyRoomSnapshot({
      ...createActiveSnapshot(),
      state: 'GameOver',
      winnerId: ME_ID,
      lastTraceResolution: resolution,
      sequenceNumber: 23,
    });

    html = renderToString(React.createElement(OperatingTable));
    // CRITICAL INVARIANT: MatchSummary MUST NOT flash while card reveal is active!
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 5. Card reveal completes — fatal 3D electro-shock / death cinematic starts
    useGameStore.getState().finishTraceReveal();
    expect(useGameStore.getState().dischargeCinematic).not.toBeNull();
    expect(useGameStore.getState().dischargeCinematic?.event.overloaded).toBe(true);

    html = renderToString(React.createElement(OperatingTable));
    // CRITICAL INVARIANT: MatchSummary MUST NOT appear during the electrocution cinematic!
    expect(html).not.toContain('match-summary');
    expect(html).not.toContain('round-intermission-banner');

    // 6. Death kinematic completes — ONLY NOW does MatchSummary mount!
    useGameStore.getState().clearDischargeCinematic();

    html = renderToString(React.createElement(OperatingTable));
    expect(html).toContain('data-testid="match-summary"');
    expect(html).toContain('KONIEC ROZGRYWKI');
    expect(html).not.toContain('round-intermission-banner');
  });

  it('Scenario 3: VoltageTest with Ground Wire — decision controls appear, zero premature modals', () => {
    // 0. Initial Active Turn with Rival holding Ground Wire
    useGameStore.getState().applyRoomSnapshot(createActiveSnapshot(true));
    let html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 1. Trace Called — Bluff check starts
    const resolution: TraceResolution = {
      accuserPlayerId: ME_ID,
      accusedPlayerId: RIVAL_ID,
      loserPlayerId: RIVAL_ID,
      revealedCards: [{ id: 'rev-3', protocol: 'Corrupted', visualSeed: 4 }],
      declaredProtocol: 'Alpha',
      bluffDetected: true,
      sequenceNumber: 30,
    };
    useGameStore.getState().applyTraceResolution(resolution);

    // 2. VoltageTestStarted event arrives (rival has Ground Wire)
    const voltageStarted: VoltageTestStartedEvent = {
      type: 'VoltageTestStarted',
      roomCode: 'CYBER-7X9',
      pendingPlayerId: RIVAL_ID,
      decisionDeadlineUtc: new Date(Date.now() + 10000).toISOString(),
      sequenceNumber: 31,
    };
    useGameStore.getState().applyVoltageTestStarted(voltageStarted);

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 3. Card reveal completes — transitions to 'decision' phase
    useGameStore.getState().finishTraceReveal();

    html = renderToString(React.createElement(OperatingTable));
    // In decision phase: NO intermission banner, NO match summary!
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 4. Rival triggers discharge
    const discharged: CapacitorDischargedEvent = {
      type: 'CapacitorDischarged',
      roomCode: 'CYBER-7X9',
      playerId: RIVAL_ID,
      roll: 4,
      riskLevel: 1,
      resultingRiskLevel: 2,
      overloaded: false,
      sequenceNumber: 32,
    };
    useGameStore.getState().applyCapacitorDischarged(discharged);
    expect(useGameStore.getState().dischargeCinematic).not.toBeNull();

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 5. Server marks RoundOver
    useGameStore.getState().applyRoomSnapshot({
      ...createActiveSnapshot(),
      state: 'RoundOver',
      lastTraceResolution: { ...resolution, sequenceNumber: 33 },
      sequenceNumber: 33,
    });

    html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');

    // 6. Discharge cinematic finishes — ONLY NOW does RoundIntermissionBanner appear!
    useGameStore.getState().clearDischargeCinematic();

    html = renderToString(React.createElement(OperatingTable));
    expect(html).toContain('round-intermission-banner');
    expect(html).not.toContain('match-summary');
  });
});
