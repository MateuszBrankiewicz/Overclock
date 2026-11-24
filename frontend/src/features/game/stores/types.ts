import type {
  CapacitorDischargedEvent,
  Card,
  CardProtocol,
  CardsPlayedEvent,
  ExploitTriggeredEvent,
  PacketSniffedEvent,
  PlayerCard,
  PlayerEliminatedEvent,
  PlayerJoinedEvent,
  PlayerSeat,
  PlayerStatusChangedEvent,
  RoomState,
  RoomStateSnapshot,
  RoundStartedEvent,
  TraceCalledEvent,
  TraceResolution,
  VoltageTestStartedEvent,
} from '../schemas/gameEvents';
import type { CharacterId } from '../utils/characterCatalog';

export type ArenaCameraFocus = 'overview' | 'table' | 'opponents';

export interface DischargeCinematic {
  event: CapacitorDischargedEvent;
  startedAtMs: number;
}

/** Card reveal after a trace: plays before the discharge cinematic. */
export interface TraceRevealCinematic {
  resolution: TraceResolution;
  startedAtMs: number;
  /** Seats as they were when the trace was called, so the outcome is not spoiled early. */
  seatsAtReveal: PlayerSeat[];
}

/** "Round N - protocol X" announcement shown when a round starts. */
export interface RoundIntro {
  roundNumber: number;
  protocol: CardProtocol | null;
  startedAtMs: number;
}

export interface RoomSlice {
  roomCode: string | null;
  roomState: RoomState | null;
  hostId: string | null;
  playerId: string | null;
  isInRoom: boolean;
  players: PlayerSeat[];
  winnerId: string | null;
  /** Final placement (1 = best) per eliminated player, reset when a new match starts. */
  placementByPlayerId: Record<string, number>;
  pendingDischargePlayerId: string | null;
  dischargeDeadlineUtc: string | null;
  intermissionDeadlineUtc: string | null;
  /** Sequence of the newest applied snapshot; older (reordered) snapshots are dropped. */
  lastSnapshotSequence: number | null;
  canActivateExploit: boolean;
  lastDischargeOutcome: CapacitorDischargedEvent | null;
  dischargeCinematic: DischargeCinematic | null;
  /** Discharge received while the trace reveal is still playing; applied when it finishes. */
  queuedDischarge: CapacitorDischargedEvent | null;
  /** Sequence number of resolved trace awaiting capacitor discharge event. */
  awaitingDischargeForSequence: number | null;
  sniffedCard: PlayerCard | null;
  selectedCharacterId: CharacterId;
  cameraFocus: ArenaCameraFocus;
  spectatorTargetPlayerId: string | null;
  setSelectedCharacter: (characterId: CharacterId) => void;
  setCameraFocus: (focus: ArenaCameraFocus) => void;
  setSpectatorTarget: (playerId: string | null) => void;
  setRoom: (roomCode: string, playerId: string) => void;
  clearDischargeCinematic: () => void;
  clearAwaitingDischarge: () => void;
  /** Ends the trace reveal and starts any discharge queued behind it. */
  finishTraceReveal: () => void;
  applyRoomSnapshot: (snapshot: RoomStateSnapshot) => void;
  applyPlayerJoined: (event: PlayerJoinedEvent) => void;
  applyPlayerStatusChanged: (event: PlayerStatusChangedEvent) => void;
  applyCapacitorDischarged: (event: CapacitorDischargedEvent) => void;
  applyPlayerEliminated: (event: PlayerEliminatedEvent) => void;
  applyExploitTriggered: (event: ExploitTriggeredEvent) => void;
  applyPacketSniffed: (event: PacketSniffedEvent) => void;
  applyVoltageTestStarted: (event: VoltageTestStartedEvent) => void;
  leaveRoom: () => void;
}

export interface HandSlice {
  myCards: PlayerCard[];
  selectedCardIds: string[];
  /** @deprecated Use `myCards` instead. */
  hand: Card[];
  setMyCards: (cards: PlayerCard[]) => void;
  /** @deprecated Use `setMyCards` instead. */
  setHand: (cards: Card[]) => void;
  toggleCardSelection: (cardId: string) => void;
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  clearSelection: () => void;
}

export interface TurnSlice {
  roundNumber: number;
  activePlayerId: string | null;
  currentTargetProtocol: CardProtocol | null;
  tablePileCount: number;
  remainingTimeSeconds: number;
  turnDeadlineUtc: string | null;
  lastPlayedCards: CardsPlayedEvent | null;
  lastTraceResolution: TraceResolution | null;
  lastTrace: TraceCalledEvent | null;
  traceReveal: TraceRevealCinematic | null;
  /** Trace shown by the showdown panel until its voltage test and discharge are over. */
  showdownTrace: TraceResolution | null;
  /** Sequence number of the last trace that was revealed (dedupes event + invoke response). */
  lastRevealedTraceSequence: number | null;
  roundIntro: RoundIntro | null;
  clearRoundIntro: () => void;
  applyRoundStarted: (event: RoundStartedEvent) => void;
  applyCardsPlayed: (event: CardsPlayedEvent) => void;
  applyTraceResolution: (resolution: TraceResolution) => void;
  applyTraceCalled: (event: TraceCalledEvent) => void;
  setRemainingTime: (seconds: number) => void;
  tickRemainingTime: () => void;
  resetGame: () => void;
}

export type GameState = RoomSlice & HandSlice & TurnSlice;

