import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { BunkerArenaCanvas } from './arena3d/BunkerArenaCanvas';
import { OperatingTable } from './OperatingTable';

describe('OperatingTable Component (TASK-2.6 & ADR 0010 3D POV Bunker Arena)', () => {
  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useGameStore.getState().leaveRoom();
    useGameStore.getState().setSelectedCharacter('ghost');
  });

  it('is exported as a React functional component', () => {
    expect(OperatingTable).toBeDefined();
    expect(typeof OperatingTable).toBe('function');
  });

  it('renders hardware terminal deck setup with 3D character selector when not connected to a room', () => {
    const html = renderToString(React.createElement(OperatingTable));
    expect(html).not.toContain('HARDWARE TERMINAL');
    expect(html).not.toContain('// INITIALIZE');
    expect(html).toContain('Stwórz stół');
    expect(html).toContain('Dołącz');
    expect(html).toContain('GHOST-01');
    expect(html).toContain('VOLT-9');
    expect(html).toContain('PROXY-X');
    expect(html).toContain('NULL-404');
  });

  it('renders fullscreen 3D POV BunkerArenaCanvas with seated operators and 3D POV hand', () => {
    useGameStore.getState().setSelectedCharacter('volt');
    useGameStore.getState().setCameraFocus('overview');
    expect(useGameStore.getState().selectedCharacterId).toBe('volt');
    expect(useGameStore.getState().cameraFocus).toBe('overview');

    const arenaHtml = renderToString(
      React.createElement(BunkerArenaCanvas, {
        players: [
          {
            playerId: '11111111-1111-1111-1111-111111111111',
            nickname: 'MeOperator',
            status: 'Active',
            isReady: true,
            handCount: 1,
            riskLevel: 2,
          },
          {
            playerId: '22222222-2222-2222-2222-222222222222',
            nickname: 'RivalRig',
            status: 'Active',
            isReady: true,
            handCount: 3,
            riskLevel: 4,
          },
        ],
        myPlayerId: '11111111-1111-1111-1111-111111111111',
        activePlayerId: '11111111-1111-1111-1111-111111111111',
        pendingDischargePlayerId: null,
        selectedCharacterId: 'volt',
        tablePileCount: 2,
        currentTargetProtocol: 'Alpha',
        roomState: 'TurnActive',
        lastPlayedCards: null,
        cameraFocus: 'overview',
        onCameraFocusChange: () => {},
        myCards: [
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            protocol: 'Alpha',
            visualSeed: 7,
          },
        ],
        selectedCardIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
        isMyTurn: true,
        isEliminated: false,
        riskLevel: 2,
      })
    );

    expect(arenaHtml).toContain('bunker-arena-stage');
    expect(arenaHtml).toContain('RivalRig');
    expect(arenaHtml).toContain('[VOLT-9]');
    expect(arenaHtml).toContain('ALPHA');
  });
  describe('arena centre overlay', () => {
    const baseProps = {
      players: [],
      myPlayerId: null,
      activePlayerId: null,
      pendingDischargePlayerId: null,
      selectedCharacterId: 'ghost' as const,
      tablePileCount: 0,
      currentTargetProtocol: null,
      lastPlayedCards: null,
      cameraFocus: 'overview' as const,
      onCameraFocusChange: () => {},
    };

    it('puts lobby panels in their own scroll container that does not rotate the camera', () => {
      const html = renderToString(
        React.createElement(
          BunkerArenaCanvas,
          { ...baseProps, roomState: 'Lobby', overlayMode: 'modal' },
          React.createElement('p', null, 'lobby-panel')
        )
      );
      expect(html).toContain('arena-overlay-modal');
      expect(html).toContain('data-no-camera-drag');
      expect(html).toContain('overflow-y-auto');
      expect(html).toContain('lobby-panel');
    });

    it('keeps passive overlays click-through so the table stays draggable', () => {
      const html = renderToString(
        React.createElement(
          BunkerArenaCanvas,
          { ...baseProps, roomState: 'BluffCheck', overlayMode: 'passive' },
          React.createElement('p', null, 'reveal-panel')
        )
      );
      expect(html).not.toContain('arena-overlay-modal');
      expect(html).toContain('pointer-events-none');
    });

    it('does not render card-reveal-sequence during BluffCheck reveal', () => {
      const html = renderToString(
        React.createElement(BunkerArenaCanvas, {
          ...baseProps,
          roomState: 'BluffCheck',
          revealedCards: [{ id: 'c1', protocol: 'Alpha', visualSeed: 1 }],
          revealDeclaredProtocol: 'Alpha',
          revealStartedAtMs: 1000,
          overlayMode: 'passive',
        })
      );
      expect(html).not.toContain('card-reveal-sequence');
    });

    it('renders the top-bar overflow button for mobile devices', () => {
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'TEST-ROOM',
        state: 'TurnActive',
        hostId: '1',
        myPlayerId: '1',
        myHand: [],
        seats: [],
        tablePileCount: 0,
        currentTargetProtocol: 'Alpha',
        currentTurnPlayerId: '1',
        roundNumber: 1,
      });
      const html = renderToString(React.createElement(OperatingTable));
      expect(html).toContain('top-bar-overflow-btn');
    });
  });
});
