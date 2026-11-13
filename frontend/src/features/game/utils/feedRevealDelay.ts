import { traceRevealDurationMs, verdictVisibleAtMs } from './cinematicTiming';
import type { FeedSource } from './formatFeedEvent';

export interface ActiveTraceReveal {
  startedAtMs: number;
  cardCount: number;
}

/**
 * How long to hold a feed entry back so the log never spoils what the table is still building up
 * to: the trace verdict waits for the cards to flip, the discharge result for the reveal to end
 * and the capacitor drum to spin down.
 */
export function feedEntryDelayMs(
  kind: FeedSource['kind'],
  reveal: ActiveTraceReveal | null,
  nowMs: number,
  spindownMs: number
): number {
  switch (kind) {
    case 'TraceCalled':
      return reveal
        ? Math.max(0, verdictVisibleAtMs(reveal.cardCount, reveal.startedAtMs) - nowMs)
        : 0;
    case 'CapacitorDischarged':
    case 'PlayerEliminated': {
      const revealLeft = reveal
        ? Math.max(0, reveal.startedAtMs + traceRevealDurationMs(reveal.cardCount) - nowMs)
        : 0;
      return revealLeft + spindownMs;
    }
    default:
      return 0;
  }
}
