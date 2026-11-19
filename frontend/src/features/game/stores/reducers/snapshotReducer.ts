import type { RoomStateSnapshot } from '../../schemas/gameEvents';
import { isCharacterId } from '../../utils/characterCatalog';
import { startTraceReveal } from '../helpers/startTraceReveal';
import type { GameState } from '../types';

/** Pure patch for applying a full server snapshot on top of the current state. */
export function applyRoomSnapshotReducer(
  state: GameState,
  snapshot: RoomStateSnapshot
): Partial<GameState> {
  const shouldClearSniffedCard =
    snapshot.state !== 'TurnActive' ||
    snapshot.currentTurnPlayerId !== state.activePlayerId ||
    snapshot.roundNumber !== state.roundNumber;

  const shouldClearLastDischarge =
    snapshot.state === 'TurnActive' ||
    snapshot.state === 'Lobby' ||
    snapshot.state === 'VoltageTest';

  const shouldClearTraceResolution =
    snapshot.state === 'TurnActive' ||
    snapshot.state === 'Lobby' ||
    snapshot.state === 'GameOver' ||
    snapshot.state === 'VoltageTest';

  const isSameRound = snapshot.roundNumber === state.roundNumber;
  const turnDeadlineUtc = snapshot.turnDeadlineUtc ?? null;

  const isNewRoundOrLobby =
    snapshot.state === 'TurnActive' ||
    snapshot.state === 'Lobby' ||
    snapshot.roundNumber !== state.roundNumber;

  const effectiveLastRevealedSeq = isNewRoundOrLobby ? null : state.lastRevealedTraceSequence;

  const snapshotTrace = snapshot.lastTraceResolution;
  const shouldTriggerRevealFromSnapshot = Boolean(
    snapshotTrace &&
      !isNewRoundOrLobby &&
      !state.traceReveal &&
      !state.dischargeCinematic &&
      !state.queuedDischarge &&
      effectiveLastRevealedSeq === null
  );

  const revealPatch = shouldTriggerRevealFromSnapshot
    ? startTraceReveal(state, snapshotTrace!)
    : {};

  const shouldClearAwaitingDischarge =
    snapshot.state === 'TurnActive' || snapshot.state === 'Lobby';

  const mySeat = snapshot.seats.find((s) => s.playerId === snapshot.myPlayerId);
  const updatedCharacterId =
    mySeat?.characterId && isCharacterId(mySeat.characterId)
      ? mySeat.characterId
      : state.selectedCharacterId;

  return {
    roomCode: snapshot.roomCode,
    roomState: snapshot.state,
    hostId: snapshot.hostId,
    playerId: snapshot.myPlayerId,
    isInRoom: true,
    selectedCharacterId: updatedCharacterId,
    players: snapshot.seats,
    winnerId: snapshot.winnerId ?? null,
    placementByPlayerId:
      snapshot.state === 'Lobby' || (state.roomState === 'GameOver' && snapshot.state !== 'GameOver')
        ? {}
        : state.placementByPlayerId,
    pendingDischargePlayerId: snapshot.pendingDischargePlayerId ?? null,
    dischargeDeadlineUtc:
      snapshot.dischargeDeadlineUtc ??
      (snapshot.state === 'VoltageTest' ? state.dischargeDeadlineUtc : null),
    intermissionDeadlineUtc:
      snapshot.intermissionDeadlineUtc ??
      (snapshot.state === 'RoundOver' ? state.intermissionDeadlineUtc : null),
    canActivateExploit: snapshot.canActivateExploit ?? false,
    lastDischargeOutcome: shouldClearLastDischarge ? null : state.lastDischargeOutcome,
    sniffedCard: shouldClearSniffedCard ? null : state.sniffedCard,
    myCards: snapshot.myHand,
    selectedCardIds: state.selectedCardIds.filter((id) =>
      snapshot.myHand.some((card) => card.id === id)
    ),
    tablePileCount: snapshot.tablePileCount,
    currentTargetProtocol: snapshot.currentTargetProtocol ?? null,
    activePlayerId: snapshot.currentTurnPlayerId ?? null,
    roundNumber: snapshot.roundNumber,
    lastTraceResolution: shouldClearTraceResolution
      ? null
      : (snapshot.lastTraceResolution ?? state.lastTraceResolution),
    turnDeadlineUtc,
    // Keep the last play while the round goes on: the snapshot right after CardsPlayed
    // must not cancel the card flight animation.
    lastPlayedCards: snapshot.state === 'TurnActive' && isSameRound ? state.lastPlayedCards : null,
    lastTrace: null,
    lastRevealedTraceSequence: effectiveLastRevealedSeq,
    ...(shouldClearAwaitingDischarge
      ? { awaitingDischargeForSequence: null, showdownTrace: null }
      : {}),
    ...revealPatch,
  };
}
