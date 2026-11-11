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
  TurnStartedEvent,
  VoltageTestStartedEvent,
} from '../schemas/gameEvents';

export interface RoomSlice {
  roomCode: string | null;
  roomState: RoomState | null;
  hostId: string | null;
  playerId: string | null;
  isInRoom: boolean;
  players: PlayerSeat[];
  winnerId: string | null;
  pendingDischargePlayerId: string | null;
  dischargeDeadlineUtc: string | null;
  canActivateExploit: boolean;
  lastDischargeOutcome: CapacitorDischargedEvent | null;
  sniffedCard: PlayerCard | null;
  setRoom: (roomCode: string, playerId: string) => void;
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
  applyRoundStarted: (event: RoundStartedEvent) => void;
  applyCardsPlayed: (event: CardsPlayedEvent) => void;
  applyTraceResolution: (resolution: TraceResolution) => void;
  setTurnStarted: (event: TurnStartedEvent) => void;
  applyTraceCalled: (event: TraceCalledEvent) => void;
  setRemainingTime: (seconds: number) => void;
  tickRemainingTime: () => void;
  resetGame: () => void;
}

export type GameState = RoomSlice & HandSlice & TurnSlice;

