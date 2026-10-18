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
});
export type PlayerCard = z.infer<typeof PlayerCardSchema>;

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
});
export type TraceResolution = z.infer<typeof TraceResolutionSchema>;

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
});
export type RoomStateSnapshot = z.infer<typeof RoomStateSnapshotSchema>;
export const PlayerGameStateSchema = RoomStateSnapshotSchema;
export type PlayerGameState = RoomStateSnapshot;

export const CardsPlayedEventSchema = z.object({
  type: z.literal('CardsPlayed').optional(),
  roomCode: z.string().optional(),
  playerId: z.string().uuid(),
  cardCount: z.number().int().min(1).max(3),
  declaredProtocol: CardProtocolSchema,
});
export type CardsPlayedEvent = z.infer<typeof CardsPlayedEventSchema>;

export const PlayerStatusChangedEventSchema = z.object({
  type: z.literal('PlayerStatusChanged').optional(),
  roomCode: z.string().optional(),
  playerId: z.string().uuid(),
  status: PlayerStatusSchema,
});
export type PlayerStatusChangedEvent = z.infer<typeof PlayerStatusChangedEventSchema>;

export const RoundStartedEventSchema = z.object({
  type: z.literal('RoundStarted').optional(),
  roomCode: z.string(),
  roundNumber: z.number().int().positive(),
  leadProtocol: CardProtocolSchema.optional(),
  activePlayerId: z.string().uuid().optional(),
});
export type RoundStartedEvent = z.infer<typeof RoundStartedEventSchema>;

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
});
export type TraceCalledEvent = z.infer<typeof TraceCalledEventSchema>;

export const TurnStartedEventSchema = z.object({
  type: z.literal('TurnStarted'),
  roomCode: z.string(),
  activePlayerId: z.string().uuid(),
  turnDeadlineUtc: z.string().datetime(),
  currentVoltage: z.number().int().min(0),
});
export type TurnStartedEvent = z.infer<typeof TurnStartedEventSchema>;

export const VoltageOverloadedEventSchema = z.object({
  type: z.literal('VoltageOverloaded'),
  roomCode: z.string(),
  eliminatedPlayerId: z.string().uuid(),
  finalVoltage: z.number().int(),
});
export type VoltageOverloadedEvent = z.infer<typeof VoltageOverloadedEventSchema>;
