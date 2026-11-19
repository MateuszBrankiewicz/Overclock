import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { playSfx, speakRobotVoice } from '../../../shared/lib/audio';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { dischargeStrikeDelayMs } from '../utils/cinematicTiming';
import { recordGameEvent, TRACE_SIREN_DELAY_MS } from './recordGameEvent';

vi.mock('../../../shared/lib/audio', () => ({
  playSfx: vi.fn(),
  setGameAudioHum: vi.fn(),
  speakRobotVoice: vi.fn(),
  useAudioSettings: { getState: () => ({ voiceEnabled: true }) },
}));

const ID = '123e4567-e89b-12d3-a456-426614174001';
const OTHER = '123e4567-e89b-12d3-a456-426614174002';

describe('recordGameEvent', () => {
  const vibrateMock = vi.fn((_pattern: VibratePattern) => true);

  beforeEach(() => {
    vi.useFakeTimers();
    vibrateMock.mockClear();
    vi.mocked(playSfx).mockClear();
    vi.stubGlobal('navigator', { vibrate: vibrateMock });
    useUiStore.setState({ feed: [] });
    useGameStore.setState({
      playerId: ID,
      players: [
        { playerId: ID, nickname: 'Volt', status: 'Active', isReady: true, handCount: 3 },
        { playerId: OTHER, nickname: 'Ghost', status: 'Active', isReady: true, handCount: 3 },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes a feed entry for a played event', () => {
    recordGameEvent({
      kind: 'CardsPlayed',
      event: { playerId: OTHER, cardCount: 2, declaredProtocol: 'Alpha' },
    });
    const feed = useUiStore.getState().feed;
    expect(feed).toHaveLength(1);
    expect(feed[0]?.text).toContain('Ghost');
    expect(feed[0]?.text).toContain('ALPHA');
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('vibrates briefly when the local player is shocked but survives', () => {
    recordGameEvent({
      kind: 'CapacitorDischarged',
      event: {
        type: 'CapacitorDischarged',
        roomCode: 'R',
        playerId: ID,
        roll: 4,
        riskLevel: 1,
        resultingRiskLevel: 2,
        overloaded: false,
      },
    });
    expect(vibrateMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(dischargeStrikeDelayMs());
    expect(vibrateMock).toHaveBeenCalledWith(60);
  });

  it('vibrates a long pattern when the local player is overloaded, not for others', () => {
    recordGameEvent({
      kind: 'CapacitorDischarged',
      event: {
        type: 'CapacitorDischarged',
        roomCode: 'R',
        playerId: ID,
        roll: 1,
        riskLevel: 1,
        resultingRiskLevel: 1,
        overloaded: true,
      },
    });
    expect(vibrateMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(dischargeStrikeDelayMs());
    expect(vibrateMock).toHaveBeenCalledWith([200, 80, 200, 80, 400]);
    vibrateMock.mockClear();
    recordGameEvent({
      kind: 'PlayerEliminated',
      event: { type: 'PlayerEliminated', roomCode: 'R', playerId: OTHER, placement: 3 },
    });
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('clears the feed when the first round starts', () => {
    useUiStore.getState().pushFeedEntry({ text: 'old', tone: 'neutral' });
    recordGameEvent({ kind: 'RoundStarted', event: { roomCode: 'R', roundNumber: 1 } });
    const texts = useUiStore.getState().feed.map((f) => f.text);
    expect(texts).not.toContain('old');
    expect(texts).toHaveLength(1);
  });

  it('triggers audio sfx for game events (ADR 0014)', () => {
    vi.useFakeTimers();

    recordGameEvent({
      kind: 'CardsPlayed',
      event: { playerId: OTHER, cardCount: 2, declaredProtocol: 'Alpha' },
    });
    vi.runAllTimers();
    expect(playSfx).toHaveBeenCalledWith('cardClick');
    expect(speakRobotVoice).toHaveBeenCalled();

    recordGameEvent({
      kind: 'TraceCalled',
      event: {
        sequenceNumber: 1,
        accuserPlayerId: ID,
        accusedPlayerId: OTHER,
        loserPlayerId: OTHER,
        declaredProtocol: 'Alpha',
        bluffDetected: true,
        revealedCards: [],
      },
    });
    expect(speakRobotVoice).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ priority: 'high' })
    );
    expect(playSfx).not.toHaveBeenCalledWith('traceSiren');
    vi.advanceTimersByTime(TRACE_SIREN_DELAY_MS);
    expect(playSfx).toHaveBeenCalledWith('traceSiren');

    recordGameEvent({
      kind: 'CapacitorDischarged',
      event: {
        type: 'CapacitorDischarged',
        roomCode: 'R',
        playerId: ID,
        roll: 3,
        riskLevel: 2,
        resultingRiskLevel: 3,
        overloaded: false,
      },
    });
    expect(playSfx).toHaveBeenCalledWith('voltageBuzz', {
      riskLevel: 2,
      rising: true,
      duration: dischargeStrikeDelayMs() / 1000,
    });
    expect(playSfx).not.toHaveBeenCalledWith('discharge');
    vi.advanceTimersByTime(dischargeStrikeDelayMs());
    expect(playSfx).toHaveBeenCalledWith('discharge');
    vi.advanceTimersByTime(300);
    expect(playSfx).toHaveBeenCalledWith('survived');

    recordGameEvent({
      kind: 'ExploitTriggered',
      event: {
        type: 'ExploitTriggered',
        roomCode: 'R',
        playerId: ID,
        exploit: 'GroundWire',
      },
    });
    expect(playSfx).toHaveBeenCalledWith('exploitActivate');

    recordGameEvent({
      kind: 'RoundStarted',
      event: { roomCode: 'R', roundNumber: 2 },
    });
    expect(playSfx).toHaveBeenCalledWith('roundStart');

    recordGameEvent({
      kind: 'PlayerEliminated',
      event: { type: 'PlayerEliminated', roomCode: 'R', playerId: OTHER, placement: 2 },
    });
    expect(playSfx).toHaveBeenCalledWith('eliminated');

    vi.useRealTimers();
  });
});
