import { useI18n } from '../../../shared/i18n';
import { useGameStore } from '../stores/useGameStore';
import { resolveCenterOverlay } from '../utils/centerOverlay';
import { resolveOutcomePhase } from '../utils/outcomePhase';

export interface TableOperator {
  nickname: string;
  isLocal: boolean;
  characterId: string | undefined;
  riskLevel: number;
}

/** Derived table state: seats, local player flags, outcome phase and showdown target. */
export function useTablePhase() {
  const { t } = useI18n();
  const roomState = useGameStore((s) => s.roomState);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const livePlayers = useGameStore((s) => s.players);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const traceReveal = useGameStore((s) => s.traceReveal);
  const showdownTrace = useGameStore((s) => s.showdownTrace);
  const pendingDischargePlayerId = useGameStore((s) => s.pendingDischargePlayerId);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const queuedDischarge = useGameStore((s) => s.queuedDischarge);
  const awaitingDischargeForSequence = useGameStore((s) => s.awaitingDischargeForSequence);

  // While the cards are being revealed, show the table as it was when the trace was called.
  const players = traceReveal?.seatsAtReveal ?? livePlayers;

  const me = players.find((p) => p.playerId === playerId);
  const isLocalPlayerPending = Boolean(playerId && pendingDischargePlayerId === playerId);
  const canUseGroundWire = Boolean(
    isLocalPlayerPending && me?.exploit?.type === 'GroundWire' && !me.exploit.isBurned
  );
  const isEliminated = me?.status === 'Eliminated';
  const isMyTurn = Boolean(activePlayerId && playerId && activePlayerId === playerId && !isEliminated);
  const isHost = Boolean(hostId && playerId && hostId === playerId);

  const phase = resolveOutcomePhase({
    roomState,
    hasTraceReveal: Boolean(traceReveal),
    hasQueuedDischarge: Boolean(queuedDischarge),
    hasDischargeCinematic: Boolean(dischargeCinematic),
    awaitingDischarge: Boolean(awaitingDischargeForSequence !== null),
  });
  const centerOverlay = resolveCenterOverlay({ roomState, phase });
  // Reveal, voltage test decision and discharge are one sequence shown by one panel.
  const isShowdown = phase === 'reveal' || phase === 'decision' || phase === 'discharge';
  const showdownTargetId =
    dischargeCinematic?.event.playerId ??
    pendingDischargePlayerId ??
    queuedDischarge?.playerId ??
    showdownTrace?.loserPlayerId ??
    null;
  const toOperator = (id: string): TableOperator => {
    const seat = players.find((p) => p.playerId === id);
    return {
      nickname: seat?.nickname ?? t.common.operator,
      isLocal: id === playerId,
      characterId: seat?.characterId,
      riskLevel: seat?.riskLevel ?? 1,
    };
  };

  return {
    players,
    me,
    canUseGroundWire,
    isEliminated,
    isMyTurn,
    isHost,
    phase,
    centerOverlay,
    isShowdown,
    showdownTargetId,
    toOperator,
  };
}
