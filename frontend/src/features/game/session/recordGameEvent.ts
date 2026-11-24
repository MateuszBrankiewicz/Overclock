import { useI18n } from '../../../shared/i18n';
import { playSfx, speakRobotVoice, useAudioSettings } from '../../../shared/lib/audio';
import { vibrate } from '../../../shared/lib/haptics';
import { prefersReducedMotion } from '../../../shared/lib/motion';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { resolveSeatCharacter } from '../utils/characterCatalog';
import { dischargeStrikeDelayMs } from '../utils/cinematicTiming';
import { feedEntryDelayMs } from '../utils/feedRevealDelay';
import { type FeedSource, formatFeedEvent } from '../utils/formatFeedEvent';

/** Delay before the trace siren plays so it does not drown out the "LIAR!" robot voice. */
export const TRACE_SIREN_DELAY_MS = 900;

/**
 * Side effects of a validated game event, run after the store apply:
 * appends a human-readable feed entry and triggers haptics for the local player.
 */
export function recordGameEvent(source: FeedSource): void {
  const { players, playerId, traceReveal } = useGameStore.getState();
  const ui = useUiStore.getState();
  if (source.kind === 'RoundStarted' && source.event.roundNumber === 1) ui.clearFeed();
  const spindownDelayMs = dischargeStrikeDelayMs(prefersReducedMotion());
  // Formatted now, while the names still match the seats of this event.
  const entry = formatFeedEvent(source, {
    players,
    localPlayerId: playerId,
    t: useI18n.getState().t.feed,
  });
  const feedDelayMs = feedEntryDelayMs(
    source.kind,
    traceReveal
      ? {
          startedAtMs: traceReveal.startedAtMs,
          cardCount: traceReveal.resolution.revealedCards.length,
        }
      : null,
    Date.now(),
    spindownDelayMs
  );
  if (feedDelayMs > 0) {
    setTimeout(() => useUiStore.getState().pushFeedEntry(entry), feedDelayMs);
  } else {
    ui.pushFeedEntry(entry);
  }
  if (source.kind === 'CapacitorDischarged' && source.event.playerId === playerId) {
    if (spindownDelayMs > 0) {
      setTimeout(() => {
        vibrate(source.event.overloaded ? 'overload' : 'shock');
      }, spindownDelayMs);
    } else {
      vibrate(source.event.overloaded ? 'overload' : 'shock');
    }
  } else if (source.kind === 'PlayerEliminated' && source.event.playerId === playerId) {
    vibrate('overload');
  }

  switch (source.kind) {
    case 'CardsPlayed': {
      const count = Math.max(1, source.event.cardCount);
      for (let i = 0; i < count; i++) {
        setTimeout(() => playSfx('cardClick'), i * 60);
      }
      const player = players.find((p) => p.playerId === source.event.playerId);
      const character = resolveSeatCharacter(player?.characterId).id;
      const t = useI18n.getState().t;
      speakRobotVoice(
        character,
        t.voice.playCards(source.event.cardCount, source.event.declaredProtocol),
        { sequenceNumber: source.event.sequenceNumber }
      );
      break;
    }
    case 'TraceCalled': {
      const accuser = players.find((p) => p.playerId === source.event.accuserPlayerId);
      const character = resolveSeatCharacter(accuser?.characterId).id;
      const t = useI18n.getState().t;
      speakRobotVoice(character, t.voice.liar, {
        priority: 'high',
        sequenceNumber: source.event.sequenceNumber,
      });
      const sirenDelayMs = useAudioSettings.getState().voiceEnabled ? TRACE_SIREN_DELAY_MS : 0;
      if (sirenDelayMs > 0) {
        setTimeout(() => playSfx('traceSiren'), sirenDelayMs);
      } else {
        playSfx('traceSiren');
      }
      break;
    }
    case 'CapacitorDischarged': {
      if (spindownDelayMs > 0) {
        playSfx('voltageBuzz', {
          riskLevel: source.event.riskLevel,
          rising: true,
          duration: spindownDelayMs / 1000,
        });
        setTimeout(() => {
          playSfx('discharge');
          if (!source.event.overloaded) {
            setTimeout(() => playSfx('survived'), 260);
          }
        }, spindownDelayMs);
      } else {
        playSfx('discharge');
        if (!source.event.overloaded) {
          setTimeout(() => playSfx('survived'), 260);
        }
      }
      break;
    }
    case 'ExploitTriggered':
      playSfx('exploitActivate');
      break;
    case 'RoundStarted':
      playSfx('roundStart');
      break;
    // PlayerEliminated is intentionally silent: the discharge strike already carries the death,
    // and a dead operator must not make any further sound.
  }
}
