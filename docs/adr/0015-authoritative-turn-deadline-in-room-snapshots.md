# 15. Authoritative turn deadline in room snapshots

Date: 2026-11-12

## Status

Accepted

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

The server runs a per-turn timeout (`TurnTimerEngine.DefaultTurnDuration`, 15 s) and auto-plays or
skips when it fires, but clients are never told when the current turn ends:

* `TurnStartedEvent` (with `TurnDeadlineUtc`) exists in `GameEngine.Contracts/GameEvents.cs` but is
  not part of `IGameClient` and is never sent by `SignalRGameNotifier`.
* `PlayerGameStateDto` (the `ReceiveGameState` snapshot) carries `DischargeDeadlineUtc` but no turn
  deadline.
* The only path that sends a turn deadline is `ExploitTriggered` (Overclock), so the turn timer HUD
  is invisible in normal play and players get timed out without warning.

As an interim fix the frontend estimates the deadline locally (`now + 15 s` whenever a snapshot shows
a new turn, `frontend/src/features/game/utils/cinematicTiming.ts`). The estimate drifts with network
latency and with reconnects mid-turn, and duplicates a server constant on the client.

## Decision Drivers

* The countdown players see must match the server timeout that actually ends their turn.
* Reconnecting clients must recover the remaining time, not restart it at 15 s.
* Keep the SignalR surface small: snapshots are already the source of truth (ADR 0003).

## Considered Options

1. **Option 1:** Add `TurnDeadlineUtc` (nullable) to `PlayerGameStateDto`, set from the room's
   current turn timer, in every snapshot while the room is `TurnActive`.
2. **Option 2:** Emit the existing `TurnStartedEvent` through a new `IGameClient.TurnStarted` method
   whenever a turn begins.
3. **Option 3:** Keep the client-side estimate.

## Decision Outcome

Chosen Option: **Option 1**, because snapshots are already broadcast after every turn change and on
reconnect, so a field there covers both live play and recovery without a new client event. The
domain records the deadline when the turn timer is scheduled (inside the single-writer loop) and the
projection copies it into the DTO. The frontend Zod schema gains `turnDeadlineUtc` (optional,
ISO string) and `applyRoomSnapshot` prefers it over the local estimate, which is removed once the
backend ships.

`TurnStartedEvent` stays unused and is removed from Contracts in the same change, to avoid two
sources for the same value.

### Enforcement

* Integration test in `backend/tests/Integration.Tests/GameHubIntegrationTests.cs`: after
  `StartRound` and after `PlayCards`, the snapshot received by every client has a non-null
  `TurnDeadlineUtc` roughly `DefaultTurnDuration` in the future; it is null outside `TurnActive`.
* SignalR contract fixture in `tests/contracts/signalr/` updated with the new field and validated
  by the frontend Zod schema test.
* Vitest: store test asserting the snapshot deadline wins over any local estimate.

## Consequences

### Positive

* The turn timer and the "last 5 seconds" warning reflect the real server timeout.
* Reconnecting players see the correct remaining time.
* The duplicated 15 s constant disappears from the client.

### Negative

* Contract change on `ReceiveGameState` (additive, nullable) needs frontend and fixture updates in
  the same commit.
* Client clock skew still affects the displayed countdown; acceptable for a 15 s window.
