import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { LobbyScreen } from './LobbyScreen';

describe('LobbyScreen Component (GFX-05)', () => {
  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe, getSnapshot, _getServerSnapshot) => getSnapshot()
    );
    useGameStore.getState().leaveRoom();
    useGameStore.getState().setSelectedCharacter('ghost');
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

  it('disables join submit button when room code input is empty', () => {
    const html = renderToString(React.createElement(LobbyScreen, { initialJoinOpen: true }));
    expect(html).toContain('disabled=""');
  });
});
