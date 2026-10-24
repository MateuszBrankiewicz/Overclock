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
  'RoundOver',
  'GameOver',
]);
export type RoomState = z.infer<typeof RoomStateSchema>;

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
});
export type PlayerSeat = z.infer<typeof PlayerSeatSchema>;

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
export type PlayerJoinedEvent = z.infer<typeof PlayerJoinedEventSchema>;

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

export const TurnStartedEventSchema = z.object({
  type: z.literal('TurnStarted'),
  roomCode: z.string(),
  activePlayerId: z.string().uuid(),
  turnDeadlineUtc: z.string().datetime(),
  currentVoltage: z.number().int().min(0),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type TurnStartedEvent = {
  type: 'TurnStarted';
  roomCode: string;
  activePlayerId: string;
  turnDeadlineUtc: string;
  currentVoltage: number;
  sequenceNumber?: number;
};

export const VoltageOverloadedEventSchema = z.object({
  type: z.literal('VoltageOverloaded'),
  roomCode: z.string(),
  eliminatedPlayerId: z.string().uuid(),
  finalVoltage: z.number().int(),
  sequenceNumber: z.number().int().nonnegative().optional(),
});
export type VoltageOverloadedEvent = {
  type: 'VoltageOverloaded';
  roomCode: string;
  eliminatedPlayerId: string;
  finalVoltage: number;
  sequenceNumber?: number;
};
