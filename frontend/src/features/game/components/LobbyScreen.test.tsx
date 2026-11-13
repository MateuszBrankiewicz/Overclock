import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { LobbyScreen } from './LobbyScreen';

describe('LobbyScreen Component (GFX-05)', () => {
  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useGameStore.getState().leaveRoom();
    useGameStore.getState().setSelectedCharacter('ghost');
    useUiStore.setState({ inviteJoin: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders lobby screen with nickname, character selector, and action buttons', () => {
    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).toContain('lobby-screen');
    expect(html).toContain('Stwórz stół');
    expect(html).toContain('Dołącz');
    expect(html).toContain('GHOST-01');
    expect(html).toContain('VOLT-9');
    expect(html).toContain('PROXY-X');
    expect(html).toContain('NULL-404');
  });

  it('renders WebGL fallback background in non-WebGL / test environment', () => {
    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).toContain('lobby-fallback-bg');
    expect(html).not.toContain('lobby-showcase-3d');
  });

  it('pre-fills and expands room code input when ?room= is present in location.search', () => {
    vi.stubGlobal('window', {
      location: { search: '?room=CYBER-7X9' },
    });

    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).toContain('value="CYBER-7X9"');
    expect(html).toContain('CYBER-7X9');
  });

  it('shows the nickname modal when an invite link needs a nickname', () => {
    useUiStore.setState({ inviteJoin: { roomCode: 'CYBER-7X9', status: 'needsNickname' } });

    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).toContain('invite-nickname-modal');
    expect(html).toContain('Podaj nick');
    expect(html).toContain('CYBER-7X9');
  });

  it('shows the joining status and no modal while an invite join is in flight', () => {
    useUiStore.setState({ inviteJoin: { roomCode: 'CYBER-7X9', status: 'joining' } });

    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).toContain('Dołączanie do stołu CYBER-7X9');
    expect(html).not.toContain('invite-nickname-modal');
  });

  it('hides the nickname modal without an invite join', () => {
    const html = renderToString(React.createElement(LobbyScreen));
    expect(html).not.toContain('invite-nickname-modal');
  });

  it('disables join submit button when room code input is empty', () => {
    const html = renderToString(React.createElement(LobbyScreen, { initialJoinOpen: true }));
    expect(html).toContain('disabled=""');
  });
});
