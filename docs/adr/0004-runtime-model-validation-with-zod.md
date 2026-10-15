# 4. Runtime Model Validation and Type Inference with Zod

Date: 2026-10-15

## Status

Accepted

## Context and Problem Statement

In **Project: Overclock**, the frontend application communicates over two distinct network boundaries:
1. **Asynchronous SignalR WebSockets:** High-frequency game events (turn ticks, card play broadcasts, bluff accusations, capacitor voltage shocks).
2. **HTTP REST Endpoints:** Authentication tokens, user profile updates, cosmetic inventory transactions, and match history logs.

TypeScript provides compile-time type safety, but types are completely erased in the browser runtime. This exposes the client to several risks:
- Malformed, unexpected, or desynchronized JSON payloads received from the server can crash the UI or cause silent bugs in the state machine.
- Manually writing duplicate TypeScript interfaces alongside runtime validation functions creates maintenance overhead and type drift.
- Unvalidated user inputs (e.g., room codes, player display names, chat commands) can corrupt local client state.
- Local session data stored in `sessionStorage` / `localStorage` (such as reconnect tokens) requires runtime verification when read after page reloads.

We need a standardized, performant, and type-safe solution for runtime schema validation that serves as the single source of truth for client models.

## Decision Drivers

* **Type Safety at System Boundaries:** Guarantee that any data crossing network or storage boundaries strictly matches the expected schema before entering the application state.
* **Single Source of Truth:** Derive TypeScript types directly from runtime schemas without manual interface duplication.
* **Fail-Safe Parsing:** Safely handle schema validation failures without throwing unhandled exceptions that break the render loop (`safeParse`).
* **Support for Discriminated Unions:** Cleanly parse polymorphic game events and player actions based on event type discriminators.

## Considered Options

1. **Option 1: Plain TypeScript Interfaces + Manual Guard Functions:** Zero bundle overhead, but prone to human error, laborious to maintain, and provides no automatic validation of nested structures.
2. **Option 2: Yup / Joi:** Popular validation libraries, but inferior TypeScript type inference compared to modern alternatives and larger bundle size.
3. **Option 3: Zod:** TypeScript-first schema validation with static type inference via `z.infer<typeof Schema>`, composable schemas, and native support for discriminated unions and transformations.
4. **Option 4: Valibot / ArkType:** Lightweight alternatives, but smaller ecosystem adoption and tooling integration compared to Zod.

## Decision Outcome

Chosen Option: **Option 3: Zod**.

### Architecture & Usage Patterns

1. **Single Source of Truth (`z.infer`):**
   All client domain models, DTOs, and event payloads are defined first as Zod schemas. Static TypeScript types are inferred directly:

   ```typescript
   import { z } from 'zod';

   export const CardSchema = z.object({
     id: z.string().uuid(),
     cardType: z.enum(['Cipher-A', 'Cipher-B', 'Cipher-C', 'Glitch']),
     isMasked: z.boolean().default(false),
   });

   export type Card = z.infer<typeof CardSchema>;

   export const GameStateProjectionSchema = z.object({
     roomCode: z.string().min(4).max(10),
     currentTurnPlayerId: z.string().uuid(),
     targetCardType: z.enum(['Cipher-A', 'Cipher-B', 'Cipher-C']),
     tablePileCount: z.number().int().nonnegative(),
     myHand: z.array(CardSchema),
     remainingSeconds: z.number().int().min(0).max(60),
   });

   export type GameStateProjection = z.infer<typeof GameStateProjectionSchema>;
   ```

2. **Discriminated Unions for SignalR Game Events:**
   Incoming real-time WebSocket messages are parsed using discriminated union schemas:

   ```typescript
   export const GameEventSchema = z.discriminatedUnion('type', [
     z.object({
       type: z.literal('TurnStarted'),
       playerId: z.string().uuid(),
       timeLimitSeconds: z.number(),
     }),
     z.object({
       type: z.literal('TraceCalled'),
       callerId: z.string().uuid(),
       revealedCards: z.array(CardSchema),
       bluffDetected: z.boolean(),
     }),
     z.object({
       type: z.literal('VoltageShockResult'),
       targetPlayerId: z.string().uuid(),
       survived: z.boolean(),
       blackout: z.boolean(),
     }),
   ]);

   export type GameEvent = z.infer<typeof GameEventSchema>;
   ```

3. **Boundary Parsing Strategy:**
   - Always use `safeParse` at network boundaries (SignalR message listeners, fetch response handlers).
   - If parsing succeeds, dispatch validated data to the Zustand store.
   - If parsing fails, log structured errors and transition connection or room state gracefully instead of throwing:

   ```typescript
   connection.on('StateUpdated', (rawPayload: unknown) => {
     const result = GameStateProjectionSchema.safeParse(rawPayload);
     if (result.success) {
       useGameStore.getState().syncServerState(result.data);
     } else {
       console.error('[SignalR] Malformed state payload:', result.error.format());
     }
   });
   ```

4. **Session and Storage Validation:**
   - Reconnect tokens read from `sessionStorage` must pass validation before initiating a reconnect handshake to the hub.

## Pros and Cons of Zod

### Positive Consequences
- **Zero Type Drift:** TypeScript types and runtime validation rules never diverge because types are generated via `z.infer`.
- **Bulletproof Resilience:** The client UI cannot crash from unexpected nulls, missing fields, or contract breaks introduced by backend updates.
- **Clear Error Diagnostics:** When schema contracts break during development, Zod reports the exact missing or invalid path (e.g., `myHand[2].cardType`).
- **Standardized Ecosystem:** Seamless integration with form libraries (React Hook Form via `@hookform/resolvers/zod`) and state management (Zustand).

### Negative Consequences / Trade-offs
- **Bundle Size:** Adds ~12–14 KB (gzipped) to the frontend bundle. For a web game application, this is negligible and well within acceptable performance budgets.
- **Runtime Parsing Cost:** Calling `safeParse` introduces a microsecond parsing overhead. For high-frequency loops (e.g., timer ticks), schemas must be instantiated once at module scope and reused, avoiding inline schema recreation.
