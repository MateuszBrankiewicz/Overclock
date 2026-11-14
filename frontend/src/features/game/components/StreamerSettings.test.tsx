import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { formatDisplayRoomCode, useUiStore } from '../stores/useUiStore';
import { CHARACTER_CATALOG } from '../utils/characterCatalog';
import { ArenaFallback } from './arena3d/ArenaFallback';
import { LobbyPlayerList } from './LobbyPlayerList';
import { RoomCodeBadge } from './RoomCodeBadge';
import { StateJsonMirror } from './StateJsonMirror';
import { StreamerSettings } from './StreamerSettings';

describe('StreamerSettings & Streamer Safe Mode', () => {
  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useGameStore.getState().leaveRoom();
    useUiStore.setState({
      maskRoomCode: false,
      holdToRevealCards: false,
      isHandRevealed: false,
    });
  });

  it('masks the room code in RoomCodeBadge, LobbyPlayerList, and StateJsonMirror when maskRoomCode is enabled', () => {
    expect(formatDisplayRoomCode('CYBER-7X9', false)).toBe('CYBER-7X9');
    expect(formatDisplayRoomCode('CYBER-7X9', true)).toBe('CYBER-***');
    expect(formatDisplayRoomCode('ALPHA', true)).toBe('***');

    useUiStore.getState().setMaskRoomCode(true);
    useGameStore.setState({ roomCode: 'CYBER-7X9' });

    const badgeHtml = renderToString(
      React.createElement(RoomCodeBadge, {
        roomCode: 'CYBER-7X9',
        showInviteLink: false,
      })
    );
    expect(badgeHtml).toContain('CYBER-***');
    expect(badgeHtml).not.toContain('CYBER-7X9');

    const lobbyHtml = renderToString(
      React.createElement(LobbyPlayerList, {
        players: [
          {
            playerId: 'p1',
            nickname: 'Host',
            status: 'Active',
            isReady: true,
            handCount: 0,
            characterId: 'ghost',
          },
        ],
        myPlayerId: 'p1',
        hostId: 'p1',
        roomCode: 'CYBER-7X9',
        isHost: true,
        onSetReady: () => {},
        onStartRound: () => {},
      })
    );
    expect(lobbyHtml).toContain('CYBER-***');
    expect(lobbyHtml).not.toContain('CYBER-7X9');

    const mirrorHtml = renderToString(React.createElement(StateJsonMirror));
    expect(mirrorHtml).toContain('CYBER-***');
    expect(mirrorHtml).not.toContain('CYBER-7X9');
  });

  it('renders hold-to-reveal button and conceals hand cards in ArenaFallback and StateJsonMirror', () => {
    useUiStore.getState().setHoldToRevealCards(true);
    useGameStore.setState({
      myCards: [{ id: 'card-1', protocol: 'Alpha', visualSeed: 1 }],
    });

    const settingsHtml = renderToString(React.createElement(StreamerSettings));
    expect(settingsHtml).toContain('HOLD [H]');

    const fallbackConcealed = renderToString(
      React.createElement(ArenaFallback, {
        opponents: [],
        myPlayerId: 'p1',
        myCharacter: CHARACTER_CATALOG[0],
        selectedCharacterId: 'ghost',
        tablePileCount: 0,
        currentTargetProtocol: 'Alpha',
        lastPlayedCards: null,
        myCards: [{ id: 'card-1', protocol: 'Alpha', visualSeed: 1 }],
        selectedCardIds: [],
        onToggleCard: () => {},
      })
    );
    expect(fallbackConcealed).not.toContain('ALPHA');

    const mirrorConcealed = renderToString(React.createElement(StateJsonMirror));
    expect(mirrorConcealed).toContain('&quot;concealed&quot;: true');
    expect(mirrorConcealed).not.toContain('card-1');

    useUiStore.getState().setHandRevealed(true);
    expect(useUiStore.getState().isHandRevealed).toBe(true);

    const fallbackRevealed = renderToString(
      React.createElement(ArenaFallback, {
        opponents: [],
        myPlayerId: 'p1',
        myCharacter: CHARACTER_CATALOG[0],
        selectedCharacterId: 'ghost',
        tablePileCount: 0,
        currentTargetProtocol: 'Alpha',
        lastPlayedCards: null,
        myCards: [{ id: 'card-1', protocol: 'Alpha', visualSeed: 1 }],
        selectedCardIds: [],
        onToggleCard: () => {},
      })
    );
    expect(fallbackRevealed).toContain('ALPHA');
  });
});
