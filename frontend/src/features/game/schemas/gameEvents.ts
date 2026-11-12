import { z } from 'zod';

export const CardProtocolSchema = z.enum(['Alpha', 'Beta', 'Gamma', 'Glitch', 'Corrupted']);
export type CardProtocol = z.infer<typeof CardProtocolSchema>;

export const PlayerStatusSchema = z.enum(['Active', 'Disconnected', 'Eliminated']);
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

export const RoomStateSchema = z.enum([
  'Lobby',
  'Dealing',
  'TurnActive',
  'BluffCheck',
  'VoltageTest',
  'RoundOver',
  'GameOver',
]);
export type RoomState = z.infer<typeof RoomStateSchema>;

export const ExploitTypeSchema = z.enum([
  'PacketSniffer',
  'GroundWire',
  'OverclockInjector',
  'EmpFlare',
]);
export type ExploitType = z.infer<typeof ExploitTypeSchema>;

export const ExploitModuleSchema = z.object({
  type: ExploitTypeSchema,
  isBurned: z.boolean(),
});
export type ExploitModule = z.infer<typeof ExploitModuleSchema>;

export const PlayerCardSchema = z.object({
  id: z.string().uuid(),
  protocol: CardProtocolSchema,
  visualSeed: z.number().int().optional(),
});
export type PlayerCard = {
  id: string;
  protocol: CardProtocol;
  visualSeed?: number;
};

export const PlayerSeatSchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string().min(1),
  status: PlayerStatusSchema,
  isReady: z.boolean(),
  handCount: z.number().int().nonnegative(),
  riskLevel: z.number().int().min(1).max(6).default(1),
  exploit: ExploitModuleSchema.nullable().optional(),
});
export type PlayerSeat = {
  playerId: string;
  nickname: string;
  status: PlayerStatus;
  isReady: boolean;
  handCount: number;
  riskLevel?: number;
  exploit?: ExploitModule | null;
};

export const TraceResolutionSchema = z.object({
  accuserPlayerId: z.string().uuid(),
  accusedPlayerId: z.string().uuid(),
  loserPlayerId: z.string().uuid(),
  revealedCards: z.array(PlayerCardSchema),
  declaredProtocol: CardProtocolSchema,
  bluffDetected: z.boolean(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type TraceResolution = {
  accuserPlayerId: string;
  accusedPlayerId: string;
  loserPlayerId: string;
  revealedCards: PlayerCard[];
  declaredProtocol: CardProtocol;
  bluffDetected: boolean;
  sequenceNumber?: number;
};

export const RoomStateSnapshotSchema = z.object({
  roomCode: z.string(),
  state: RoomStateSchema,
  hostId: z.string().uuid(),
  myPlayerId: z.string().uuid(),
  myHand: z.array(PlayerCardSchema),
  seats: z.array(PlayerSeatSchema),
  tablePileCount: z.number().int().nonnegative(),
  currentTargetProtocol: CardProtocolSchema.nullable().optional(),
  currentTurnPlayerId: z.string().uuid().nullable().optional(),
  roundNumber: z.number().int().nonnegative(),
  lastTraceResolution: TraceResolutionSchema.nullable().optional(),
  winnerId: z.string().uuid().nullable().optional(),
  pendingDischargePlayerId: z.string().uuid().nullable().optional(),
  dischargeDeadlineUtc: z.string().datetime().nullable().optional(),
  turnDeadlineUtc: z.string().datetime({ offset: true }).nullable().optional(),
  canActivateExploit: z.boolean().default(false),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type RoomStateSnapshot = {
  roomCode: string;
  state: RoomState;
  hostId: string;
  myPlayerId: string;
  myHand: PlayerCard[];
  seats: PlayerSeat[];
  tablePileCount: number;
  currentTargetProtocol?: CardProtocol | null;
  currentTurnPlayerId?: string | null;
  roundNumber: number;
  lastTraceResolution?: TraceResolution | null;
  winnerId?: string | null;
  pendingDischargePlayerId?: string | null;
  dischargeDeadlineUtc?: string | null;
  turnDeadlineUtc?: string | null;
  canActivateExploit?: boolean;
  sequenceNumber?: number;
};
export const PlayerGameStateSchema = RoomStateSnapshotSchema;
export type PlayerGameState = RoomStateSnapshot;
export const GameStateSnapshotSchema = RoomStateSnapshotSchema;
export type GameStateSnapshot = RoomStateSnapshot;

export const RoomJoinResultSchema = z.object({
  roomCode: z.string(),
  playerId: z.string().uuid(),
  sessionToken: z.string().uuid(),
  gameState: RoomStateSnapshotSchema,
});
export type RoomJoinResult = {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  gameState: RoomStateSnapshot;
};

export const PlayCardsContractSchema = z.object({
  roomCode: z.string(),
  playerId: z.string().uuid(),
  cardIds: z.array(z.string().uuid()),
  declaredProtocol: CardProtocolSchema,
});
export type PlayCardsContract = z.infer<typeof PlayCardsContractSchema>;

export const CallTraceContractSchema = z.object({
  roomCode: z.string(),
  accuserPlayerId: z.string().uuid(),
});
export type CallTraceContract = z.infer<typeof CallTraceContractSchema>;

export const ReconnectContractSchema = z.object({
  roomCode: z.string(),
  sessionToken: z.string().uuid(),
  newConnectionId: z.string().min(1),
});
export type ReconnectContract = z.infer<typeof ReconnectContractSchema>;

export const CardsPlayedEventSchema = z.object({
  type: z.literal('CardsPlayed').optional(),
  roomCode: z.string().optional(),
  playerId: z.string().uuid(),
  cardCount: z.number().int().min(1).max(3),
  declaredProtocol: CardProtocolSchema,
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type CardsPlayedEvent = {
  type?: 'CardsPlayed';
  roomCode?: string;
  playerId: string;
  cardCount: number;
  declaredProtocol: CardProtocol;
  sequenceNumber?: number;
};

export const PlayerStatusChangedEventSchema = z.object({
  type: z.literal('PlayerStatusChanged').optional(),
  roomCode: z.string().optional(),
  playerId: z.string().uuid(),
  status: PlayerStatusSchema,
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type PlayerStatusChangedEvent = {
  type?: 'PlayerStatusChanged';
  roomCode?: string;
  playerId: string;
  status: PlayerStatus;
  sequenceNumber?: number;
};

export const RoundStartedEventSchema = z.object({
  type: z.literal('RoundStarted').optional(),
  roomCode: z.string(),
  roundNumber: z.number().int().positive(),
  leadProtocol: CardProtocolSchema.optional(),
  activePlayerId: z.string().uuid().optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type RoundStartedEvent = {
  type?: 'RoundStarted';
  roomCode: string;
  roundNumber: number;
  leadProtocol?: CardProtocol;
  activePlayerId?: string;
  sequenceNumber?: number;
};

export const PlayerJoinedEventSchema = PlayerSeatSchema.or(
  z.object({
    type: z.literal('PlayerJoined').optional(),
    roomCode: z.string().optional(),
    player: PlayerSeatSchema,
  })
);
export type PlayerJoinedEvent =
  | PlayerSeat
  | {
      type?: 'PlayerJoined';
      roomCode?: string;
      player: PlayerSeat;
    };

// Legacy suit and card representations preserved for existing store and test fixtures
export const CardSuitSchema = z.enum(['signal', 'clock', 'overload', 'ground']);
export type CardSuit = z.infer<typeof CardSuitSchema>;

export const CardSchema = z.object({
  id: z.string().uuid(),
  suit: CardSuitSchema,
  value: z.number().int().min(1).max(10),
});
export type Card = z.infer<typeof CardSchema>;

export const TraceCalledEventSchema = z.object({
  type: z.literal('TraceCalled'),
  roomCode: z.string(),
  callerId: z.string().uuid(),
  accusedPlayerId: z.string().uuid(),
  revealedCards: z.array(CardSchema),
  bluffDetected: z.boolean(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type TraceCalledEvent = {
  type: 'TraceCalled';
  roomCode: string;
  callerId: string;
  accusedPlayerId: string;
  revealedCards: Card[];
  bluffDetected: boolean;
  sequenceNumber?: number;
};

export const CapacitorDischargedEventSchema = z.object({
  type: z.literal('CapacitorDischarged'),
  roomCode: z.string(),
  playerId: z.string().uuid(),
  roll: z.number().int().min(1).max(6),
  riskLevel: z.number().int().min(1).max(6),
  resultingRiskLevel: z.number().int().min(1).max(6),
  overloaded: z.boolean(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type CapacitorDischargedEvent = {
  type: 'CapacitorDischarged';
  roomCode: string;
  playerId: string;
  roll: number;
  riskLevel: number;
  resultingRiskLevel: number;
  overloaded: boolean;
  sequenceNumber?: number;
};

export const PlayerEliminatedEventSchema = z.object({
  type: z.literal('PlayerEliminated'),
  roomCode: z.string(),
  playerId: z.string().uuid(),
  placement: z.number().int().min(1),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type PlayerEliminatedEvent = {
  type: 'PlayerEliminated';
  roomCode: string;
  playerId: string;
  placement: number;
  sequenceNumber?: number;
};

export const ExploitTriggeredEventSchema = z.object({
  type: z.literal('ExploitTriggered'),
  roomCode: z.string(),
  playerId: z.string().uuid(),
  exploit: ExploitTypeSchema,
  newTargetProtocol: CardProtocolSchema.nullable().optional(),
  newRiskLevel: z.number().int().min(1).max(6).nullable().optional(),
  turnDeadlineUtc: z.string().datetime().nullable().optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type ExploitTriggeredEvent = {
  type: 'ExploitTriggered';
  roomCode: string;
  playerId: string;
  exploit: ExploitType;
  newTargetProtocol?: CardProtocol | null;
  newRiskLevel?: number | null;
  turnDeadlineUtc?: string | null;
  sequenceNumber?: number;
};

export const PacketSniffedEventSchema = z.object({
  type: z.literal('PacketSniffed'),
  roomCode: z.string(),
  playerId: z.string().uuid(),
  card: PlayerCardSchema,
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type PacketSniffedEvent = {
  type: 'PacketSniffed';
  roomCode: string;
  playerId: string;
  card: PlayerCard;
  sequenceNumber?: number;
};

export const VoltageTestStartedEventSchema = z.object({
  type: z.literal('VoltageTestStarted'),
  roomCode: z.string(),
  pendingPlayerId: z.string().uuid(),
  decisionDeadlineUtc: z.string().datetime().nullable().optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type VoltageTestStartedEvent = {
  type: 'VoltageTestStarted';
  roomCode: string;
  pendingPlayerId: string;
  decisionDeadlineUtc?: string | null;
  sequenceNumber?: number;
};

export const ActivateExploitContractSchema = z.object({
  roomCode: z.string(),
  playerId: z.string().uuid(),
  exploit: ExploitTypeSchema,
  newTargetProtocol: CardProtocolSchema.nullable().optional(),
});
export type ActivateExploitContract = z.infer<typeof ActivateExploitContractSchema>;

export const TriggerDischargeContractSchema = z.object({
  roomCode: z.string(),
  playerId: z.string().uuid(),
});
export type TriggerDischargeContract = z.infer<typeof TriggerDischargeContractSchema>;

export const LeaveRoomContractSchema = z.object({
  roomCode: z.string(),
  playerId: z.string().uuid(),
});
export type LeaveRoomContract = z.infer<typeof LeaveRoomContractSchema>;

