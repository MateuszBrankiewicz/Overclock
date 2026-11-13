import { describe, expect, it } from 'vitest';

import { traceRevealDurationMs, verdictVisibleAtMs } from './cinematicTiming';
import { feedEntryDelayMs } from './feedRevealDelay';

describe('feedEntryDelayMs', () => {
  const reveal = { startedAtMs: 1000, cardCount: 2 };

  it('holds the trace verdict back until the cards are face-up', () => {
    expect(feedEntryDelayMs('TraceCalled', reveal, 1000, 1400)).toBe(
      verdictVisibleAtMs(2, 1000) - 1000
    );
    expect(feedEntryDelayMs('TraceCalled', null, 1000, 1400)).toBe(0);
  });

  it('holds discharge results until the reveal and the drum spin-down are over', () => {
    expect(feedEntryDelayMs('CapacitorDischarged', reveal, 1500, 1400)).toBe(
      1000 + traceRevealDurationMs(2) - 1500 + 1400
    );
    expect(feedEntryDelayMs('PlayerEliminated', null, 1500, 1400)).toBe(1400);
  });

  it('posts ordinary events immediately', () => {
    expect(feedEntryDelayMs('CardsPlayed', reveal, 1500, 1400)).toBe(0);
    expect(feedEntryDelayMs('RoundStarted', reveal, 1500, 1400)).toBe(0);
  });
});
