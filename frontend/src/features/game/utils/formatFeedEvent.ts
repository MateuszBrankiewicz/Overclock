import type { Translations } from '../../../shared/i18n';
import type {
  CapacitorDischargedEvent,
  CardsPlayedEvent,
  ExploitTriggeredEvent,
  PlayerEliminatedEvent,
  PlayerSeat,
  RoundStartedEvent,
  TraceResolution,
} from '../schemas/gameEvents';

export type FeedTone = 'neutral' | 'danger' | 'success' | 'info';

export interface FeedEntry {
  id: number;
  text: string;
  tone: FeedTone;
}

export type FeedSource =
  | { kind: 'CardsPlayed'; event: CardsPlayedEvent }
  | { kind: 'TraceCalled'; event: TraceResolution }
  | { kind: 'ExploitTriggered'; event: ExploitTriggeredEvent }
  | { kind: 'CapacitorDischarged'; event: CapacitorDischargedEvent }
  | { kind: 'PlayerEliminated'; event: PlayerEliminatedEvent }
  | { kind: 'RoundStarted'; event: RoundStartedEvent };

export interface FeedContext {
  players: PlayerSeat[];
  localPlayerId: string | null;
  t: Translations['feed'];
}

export function resolvePlayerName(playerId: string, ctx: FeedContext): string {
  if (playerId === ctx.localPlayerId) return ctx.t.you;
  return ctx.players.find((p) => p.playerId === playerId)?.nickname ?? ctx.t.unknownPlayer;
}

/** Pure formatter: validated event -> feed entry (without id). */
export function formatFeedEvent(source: FeedSource, ctx: FeedContext): Omit<FeedEntry, 'id'> {
  const { t } = ctx;
  const name = (id: string) => resolvePlayerName(id, ctx);
  switch (source.kind) {
    case 'CardsPlayed': {
      const e = source.event;
      return {
        text: t.played(name(e.playerId), e.cardCount, e.declaredProtocol.toUpperCase()),
        tone: 'neutral',
      };
    }
    case 'TraceCalled': {
      const e = source.event;
      return {
        text: t.traceCalled(name(e.accuserPlayerId), name(e.accusedPlayerId), e.bluffDetected),
        tone: 'danger',
      };
    }
    case 'ExploitTriggered': {
      const e = source.event;
      return { text: t.exploitUsed(name(e.playerId), t.exploits[e.exploit]), tone: 'info' };
    }
    case 'CapacitorDischarged': {
      const e = source.event;
      return e.overloaded
        ? { text: t.overloaded(name(e.playerId), e.roll), tone: 'danger' }
        : { text: t.survived(name(e.playerId), e.roll), tone: 'success' };
    }
    case 'PlayerEliminated': {
      const e = source.event;
      return { text: t.eliminated(name(e.playerId), e.placement), tone: 'danger' };
    }
    case 'RoundStarted':
      return {
        text: t.roundStarted(source.event.roundNumber, source.event.leadProtocol?.toUpperCase()),
        tone: 'info',
      };
  }
}
