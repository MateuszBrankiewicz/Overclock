import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '../stores/useGameStore';
import { DebugTerminal } from './DebugTerminal';
import { LobbyControls } from './LobbyControls';
import { StateJsonMirror } from './StateJsonMirror';
import { TraceResolutionBanner } from './TraceResolutionBanner';

describe('DebugTerminal Components (TASK-0.10)', () => {
  beforeEach(() => {
    useGameStore.getState().leaveRoom();
  });

  it('exports DebugTerminal, LobbyControls, StateJsonMirror, and TraceResolutionBanner', () => {
    expect(DebugTerminal).toBeDefined();
    expect(typeof DebugTerminal).toBe('function');
    expect(LobbyControls).toBeDefined();
    expect(typeof LobbyControls).toBe('function');
    expect(StateJsonMirror).toBeDefined();
    expect(typeof StateJsonMirror).toBe('function');
    expect(TraceResolutionBanner).toBeDefined();
    expect(typeof TraceResolutionBanner).toBe('function');
  });

  it('reflects updated game state in store when room is joined and cards are selected', () => {
    useGameStore.getState().setRoom('CYBER-TEST', 'player-uuid-1');
    useGameStore.getState().setMyCards([
      { id: 'card-1', protocol: 'Alpha' },
      { id: 'card-2', protocol: 'Beta' },
    ]);

    expect(useGameStore.getState().roomCode).toBe('CYBER-TEST');
    expect(useGameStore.getState().isInRoom).toBe(true);
    expect(useGameStore.getState().myCards).toHaveLength(2);

    useGameStore.getState().toggleCardSelection('card-1');
    expect(useGameStore.getState().selectedCardIds).toEqual(['card-1']);

    useGameStore.getState().toggleCardSelection('card-1');
    expect(useGameStore.getState().selectedCardIds).toEqual([]);
  });
});

