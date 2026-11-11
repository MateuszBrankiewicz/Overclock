import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LobbyPlayerList } from './LobbyPlayerList';

describe('LobbyPlayerList Component', () => {
  const mockPlayers = [
    {
      playerId: '11111111-1111-1111-1111-111111111111',
      nickname: 'AlphaPlayer',
      status: 'Active' as const,
      isReady: true,
      handCount: 0,
      riskLevel: 1,
    },
    {
      playerId: '22222222-2222-2222-2222-222222222222',
      nickname: 'BetaPlayer',
      status: 'Active' as const,
      isReady: false,
      handCount: 0,
      riskLevel: 1,
    },
  ];

  it('renders room code and player nicknames with ready badges', () => {
    const html = renderToString(
      React.createElement(LobbyPlayerList, {
        players: mockPlayers,
        myPlayerId: '11111111-1111-1111-1111-111111111111',
        hostId: '11111111-1111-1111-1111-111111111111',
        roomCode: 'CYBER-404',
        isHost: true,
        onSetReady: () => {},
        onStartRound: () => {},
      })
    );

    expect(html).toContain('CYBER-404');
    expect(html).toContain('AlphaPlayer');
    expect(html).toContain('BetaPlayer');
    expect(html).toContain('HOST');
    expect(html).toContain('GOTOWY');
    expect(html).toContain('NIEGOTOWY');
  });
});
