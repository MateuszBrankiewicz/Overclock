import { z } from 'zod';

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
