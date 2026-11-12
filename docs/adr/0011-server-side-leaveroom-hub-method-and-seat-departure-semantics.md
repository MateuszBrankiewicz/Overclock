# 11. Server-Side LeaveRoom Hub Method and Seat Departure Semantics

Date: 2026-11-12

## Status

Proposed

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

Today a player can only *stop being connected*; there is no way to *leave*:

* Frontend `leaveRoom()` in `frontend/src/features/game/hooks/useDebugTerminal.ts` only calls `clearSession()` (or `clearGameSession()`), `useGameStore.leaveRoom()` and `clearFeed()`. It never invokes the hub. `GameHub` has no `LeaveRoom` method (`CreateRoom`, `JoinRoom`, `SetReady`, `StartRound`, `PlayCards`, `CallTrace`, `Reconnect`, `ActivateExploit`, `TriggerDischarge` only).
* The server therefore keeps the seat as `Active` and keeps the SignalR connection registered in `IConnectionTracker` and in the SignalR group for as long as the socket stays open. In the lobby this is visible to every other player: the "leaver" still counts toward `Room.NotAllPlayersReady` in `GameRoom.StartRound`, so an unready ghost seat blocks the match.
* When the socket does eventually close, `GameHub.OnDisconnectedAsync` dispatches `DisconnectPlayerCommand`, which marks the seat `Disconnected` and starts the 30 s grace period of [ADR 0003](0003-realtime-engine-signalr-and-state-machine.md) §5. On expiry the handler removes the seat in `Lobby` (`GameRoom.RemovePlayer`) or eliminates it in a match (`GameRoom.EliminatePlayer`). `GameRoom.RemovePlayer` is currently reachable **only** from that grace-expiry path.
* A deliberate leave is indistinguishable from a network drop, always costs up to 30 s of ghost seat, and a player who leaves and immediately joins another room keeps the old seat alive.

Adding a hub method is a change to the SignalR communication protocol, which requires an ADR ([AGENTS.md](../../AGENTS.md) §1.2). It also touches room state, so it must obey the single-writer rule of ADR 0003 §2.

## Decision Drivers

* **Single-writer integrity:** the seat mutation must run inside the room's `session.EnqueueAsync(...)` loop, never from the hub thread.
* **No duplicated rules:** reuse the existing `RemovePlayer` / `EliminatePlayer` / host re-assignment logic instead of a third copy of the grace-expiry code.
* **Idempotency:** the client may retry, double-click, or race the grace timer; a repeated leave must never produce a 500 or a second broadcast storm.
* **Fairness mid-match:** leaving must not stall the table nor let a player dodge a pending voltage test.
* **Hub stays a transport adapter:** `GameHub` validates the caller via `ValidateCaller` and dispatches a Mediator command (AGENTS.md §3).

## Considered Options

1. **Keep local-only leave (status quo):** rely on disconnect + 30 s grace. Rejected: ghost seats block `StartRound` readiness and the table for up to 30 s per leave.
2. **Client closes the socket on leave:** `connection.stop()` makes the server run the disconnect path. Rejected: still 30 s grace, cannot distinguish leave from drop, and the connection is shared with the next room the player may join.
3. **Explicit `LeaveRoom(roomCode)` hub method + `LeaveRoomCommand` executed in the room loop (Chosen).**

## Decision Outcome

Chosen Option: **Option 3**.

### Protocol

* New hub method `Task<HubResponse> LeaveRoom(LeaveRoomRequest request)` with `LeaveRoomRequest(string RoomCode)` in `HubRequests.cs`, following the `SetReady` / `StartRound` shape.
* New `LeaveRoomCommand(string RoomCode, Guid PlayerId)` in `Overclock.Modules.GameEngine.Application/Rooms/Commands/`, handled with `session.EnqueueAsync(room => ...)`. The caller identity comes from `ValidateCaller`, never from the request body.
* **No new server-to-client event.** Departure is announced with the notifications clients already validate: `PlayerStatusChanged` (status `Eliminated` for a forfeit) and a full snapshot broadcast through `IGameNotifier.BroadcastSnapshotsAsync` (the same pair the grace-expiry path emits). This keeps `IGameClient` and the Zod event set unchanged. A dedicated `PlayerLeft` event was considered and rejected as redundant with the snapshot (`seats` already omits a removed player).
* After the command succeeds the hub calls `Groups.RemoveFromGroupAsync` and `connectionTracker.Remove(Context.ConnectionId)` (so a later socket close does **not** trigger `DisconnectPlayerCommand` for a seat that is already gone), and `IDisconnectGraceManager.CancelGracePeriod(sessionToken)` is called for the leaving seat.

### Domain semantics (new `GameRoom.Leave(PlayerId)`)

| Room state when leaving | Effect |
| :--- | :--- |
| `Lobby` | Seat removed via the existing `RemovePlayer`. Host re-assigned if the host left. Empty room: `turnTimer.Cancel`, `registry.Remove` (as the grace path already does). |
| `Dealing`, `TurnActive`, `VoltageTest`, `RoundOver` | **Forfeit = elimination.** Delegates to the existing `EliminatePlayer` (turn advance, host re-assignment, `GameOver` when one active seat remains, turn timer restart exactly as in `DisconnectPlayerCommand`). The seat is flagged `HasLeft`, its `ConnectionId` is cleared and its session token can no longer `Reconnect`. A pending voltage test of the leaver is resolved by the existing eliminate path, not skipped. |
| `GameOver` | Seat is removed (the match is decided; a rematch must not revive a leaver). Host re-assigned if needed. |

* A `HasLeft` seat is pruned from `_seats` when the room returns to `Lobby` / starts a new match, because `PlayerSeat.ResetForMatch` currently revives every `Eliminated` seat and would otherwise resurrect leavers.
* Host re-assignment on leave prefers the first seat that is **not** `Eliminated` **and not** `Disconnected` (today `RemovePlayer` takes `_seats[0]` and `EliminatePlayer` takes the first non-eliminated seat, either of which may be a disconnected seat). The same helper is reused by [ADR 0013](0013-server-driven-round-advance-and-host-re-assignment-on-disconnect.md).
* `MatchFinishedEvent` (ADR 0003 §6) treats a forfeiting player as a loser with their elimination placement.

### Idempotency

* Unknown room, unknown/untracked connection, or a seat that is already gone returns `Result.Success()` (a no-op), not `NotFound` / `Unauthorized`. Only a `RoomCode` mismatch for a *tracked* connection still returns `Forbidden("Connection.RoomMismatch")`.
* The grace-expiry callback already no-ops when the seat is missing or no longer `Disconnected`, so leave-then-timer is safe.

### Client and contract impact

* `leaveRoom()` invokes `LeaveRoom` best-effort (bounded timeout), then **always** clears the saved session and the local store regardless of the response; failure falls back to the disconnect/grace path.
* `HubResponse` is already a generic envelope, so no payload schema is added. A `LeaveRoomContractDto(string RoomCode, Guid PlayerId)` fixture is added in `Overclock.Modules.GameEngine.Contracts` next to `PlayCardsContractDto` and exported to `tests/contracts/signalr/LeaveRoomContract.json`; its Zod counterpart `LeaveRoomContractSchema` is added to `features/game/schemas/gameEvents.ts` per [ADR 0007](0007-api-contract-pipeline-orval-and-zod.md). REST/Orval output is unaffected; `frontend/src/shared/api/generated/**` is not touched.
* Redis room metadata (Host ID, ADR 0003 §7) must be updated on host re-assignment.

### Enforcement

* **Domain tests** (`backend/tests/GameEngine.Domain.Tests/Rooms/`): `Leave` in each `RoomState` row above (lobby removal, mid-match forfeit, `GameOver` removal), host re-assignment skipping `Disconnected`/`Eliminated` seats, `HasLeft` seat not revived by `ResetForMatch`/rematch, leave by an unknown player is `NotFound` at domain level.
* **Integration tests** (`backend/tests/Integration.Tests/GameHubIntegrationTests.cs`, real Postgres/Redis per [testing.md](../architecture/testing.md)): two clients; `LeaveRoom` in lobby removes the seat and the other client receives a snapshot without it; host leave re-assigns `HostId`; mid-match leave eliminates and the remaining client gets `PlayerStatusChanged` + snapshot; second `LeaveRoom` returns success; closing the socket after `LeaveRoom` does not start a grace timer (`HasActiveGracePeriod` is false); wrong `RoomCode` returns `Forbidden`.
* **Single-writer:** the handler's only room access is inside `EnqueueAsync`; verified by the existing handler-shape rules in `Architecture.Tests/CqrsShapeTests.cs` (no `DbContext`/room mutation in `GameHub`) plus an integration test that fires `LeaveRoom` and `PlayCards` concurrently and asserts a consistent final snapshot.
* **Contract fixture:** `SignalRContractFixtureTests` generates `LeaveRoomContract.json` (snapshot; a change fails the test until re-committed) and a Vitest contract test parses it with `LeaveRoomContractSchema`.
* **Frontend:** a Vitest test on `leaveRoom()` asserts `invokeHubMethod('LeaveRoom', ...)` is called and the session is cleared even when the invoke rejects.
* `Architecture.Tests` are not modified.

## Consequences

### Positive

* Deliberate leaves free the seat immediately; the lobby readiness gate and the table are no longer blocked by ghost seats.
* Reuses the existing elimination/removal rules; one code path for "seat stops playing" shared with grace expiry.
* No change to `IGameClient` or to the set of server-to-client events.

### Negative

* Mid-match leave is irreversible (no rejoin), unlike a network drop which has the 30 s grace window; players who tap Leave by accident lose their seat.
* New `HasLeft` seat state and pruning rule add one more concept to `PlayerSeat`/`GameRoom`.
* A leave that fails to reach the server (offline) silently degrades to the grace-period behaviour.
