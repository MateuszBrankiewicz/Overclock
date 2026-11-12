import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { LeaveTableButton } from './LeaveTableButton';
import { MatchSummary } from './MatchSummary';

const players = [
  { playerId: 'p1', nickname: 'Alpha', status: 'Active' as const, isReady: true, handCount: 1 },
  { playerId: 'p2', nickname: 'Beta', status: 'Eliminated' as const, isReady: true, handCount: 0 },
  { playerId: 'p3', nickname: 'Gamma', status: 'Eliminated' as const, isReady: true, handCount: 0 },
];

const render = (isHost: boolean) =>
  renderToString(
    React.createElement(MatchSummary, {
      players,
      placementByPlayerId: { p2: 3, p3: 2 },
      winnerId: 'p1',
      myPlayerId: 'p3',
      roundNumber: 4,
      isHost,
      onPlayAgain: () => undefined,
      onLeave: () => undefined,
    })
  );

describe('MatchSummary', () => {
  it('renders the podium in placement order with the winner highlighted', () => {
    const html = render(true);
    expect(html).toContain('match-summary');
    expect(html.indexOf('Alpha')).toBeLessThan(html.indexOf('Gamma'));
    expect(html.indexOf('Gamma')).toBeLessThan(html.indexOf('Beta'));
    expect(html).toContain('border-amber-400');
  });

  it('offers the rematch to the host and a waiting note to everyone else', () => {
    expect(render(true)).toContain('Zagraj ponownie');
    const guest = render(false);
    expect(guest).not.toContain('Zagraj ponownie');
    expect(guest).toContain('Czekamy');
  });
});

describe('LeaveTableButton', () => {
  it('renders an inline confirmation instead of leaving immediately', () => {
    const html = renderToString(
      React.createElement(LeaveTableButton, { onLeave: () => undefined, initialState: 'confirming' })
    );
    expect(html).toContain('Opuścić stół?');
    expect(html).toContain('Tak');
    expect(html).toContain('Nie');
  });
});

describe('placement tracking in the room slice', () => {
  beforeEach(() => useGameStore.getState().leaveRoom());

  it('records placements from PlayerEliminated and resets on leave', () => {
    useGameStore.getState().applyPlayerEliminated({
      type: 'PlayerEliminated',
      roomCode: 'ROOM',
      playerId: 'p2',
      placement: 3,
    });
    expect(useGameStore.getState().placementByPlayerId).toEqual({ p2: 3 });
    useGameStore.getState().leaveRoom();
    expect(useGameStore.getState().placementByPlayerId).toEqual({});
  });
});
