# 13. Server-Driven Round Advance and Host Re-Assignment on Disconnect

Date: 2026-11-12

## Status

Proposed

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

Between rounds the game relies on the **host's browser** to move forward:

* `GameRoom.StartRound` rejects anyone but `HostId` (`Room.OnlyHostCanStart`), also from `RoundOver`.
* There is **no server-side intermission timer**. `TimerKind` has only `Turn` and `DischargeDecision`. The next round starts because `RoundIntermissionBanner.tsx` runs a local 3 s countdown (after the 3D discharge cinematic) and, only on the host's client, calls `onStartNextRound` exactly once.
* The server re-assigns `HostId` in just two places: `GameRoom.RemovePlayer` (lobby; takes `_seats[0]`) and `GameRoom.EliminatePlayer` (takes the first non-eliminated seat). Neither looks at connection state, so the new host can itself be `Disconnected`.
* A dropped host follows [ADR 0003](0003-realtime-engine-signalr-and-state-machine.md) §5: `DisconnectPlayerCommand` marks the seat `Disconnected`, waits the 30 s grace period, then eliminates the seat (which finally re-assigns the host). During that window — and indefinitely if the host's socket is alive but the tab is hidden/throttled, because the auto-start is client-side — the intermission stalls. `intermissionFallback.ts` documents this: after `HOST_GRACE_SECONDS = 6` non-hosts see `hostGone` and "can only wait or leave".

So the failure modes are: (a) up to 30 s of stall plus a possibly-disconnected successor on host drop; (b) unbounded stall with a live-but-idle host; (c) round progression depends on a client, contradicting the "authoritative server" driver of ADR 0003.

Changing who may advance the game and adding a server timer shifts domain responsibilities and extends the SignalR snapshot, so it needs an ADR.

## Decision Drivers

* **Authoritative server:** progression of the state machine should not depend on any one client being responsive.
* **Single-writer loop:** both re-assignment and auto-start must run inside `EnqueueAsync`.
* **Reuse existing mechanisms:** the 30 s `IDisconnectGraceManager` and `ITurnTimerEngine`/`TimerKind` already exist.
* **Minimal protocol surface:** prefer additive fields; keep `StartRound` for explicit human starts (lobby / rematch).
* **Predictable UX:** the cinematic-driven countdown must stay in sync with the server.

## Considered Options

1. **Option A — Host migration after a grace period.** On `DisconnectPlayerCommand`, after a (shorter) disconnection grace, re-assign `HostId` to the next `Active`, connected seat without eliminating the old host, broadcast `HostChanged` via snapshot. The new host's client then auto-starts the round.
   * *Pros:* keeps the "host controls start" model; the disconnected player keeps their seat for the full 30 s.
   * *Cons:* does not fix a live-but-idle host; second grace timer next to the elimination timer (two timers, two orderings to reason about); the old host may reconnect and must be told they are no longer host (flapping `isHost` in the client during intermission); the round still waits on a client round trip.
2. **Option B — Server-driven round advance.** The room schedules an intermission timer when entering `RoundOver`; on expiry the room loop calls a system path to deal the next round, independent of any host or client. Host stays relevant only for lobby start and post-`GameOver` rematch.
   * *Pros:* removes the dependency on a client entirely (fixes a, b and c); one timer in the existing timer engine; the host drop only matters in `Lobby`/`GameOver`.
   * *Cons:* needs a new timer kind and a snapshot field so clients can render the countdown; removes the host-click affordance mid-match (acceptable — it is already automatic today).
3. **Option C — Do nothing; keep client fallback UI.** Rejected: leaves failure modes (a)–(c).

## Decision Outcome

Chosen Option: **Option B**, together with a small, shared fix to host selection.

### Server-driven round advance

* Add `TimerKind.Intermission` and `ITurnTimerEngine`-style scheduling (`StartIntermission(session, roundNumber, duration)` / `Cancel`) so that entering `RoundOver` — after the elimination/trace/discharge resolution that sets `State = RoundOver` — starts a timer. The duration is a named constant `IntermissionDuration` (initial proposal: 8 s, i.e. the discharge cinematic plus the existing 3 s countdown), injectable for tests through the same `ITurnDelay` abstraction as `TurnTimerEngine`.
* On expiry the timer enqueues an action into the room loop. It is guarded by the round number (like `TurnSequenceId`): a stale timer, a room that already left `RoundOver`, or `GameOver` makes it a no-op. The action calls a new `GameRoom.AdvanceRound(IRandomSource)` that shares the dealing logic of `StartRound` but has no requester check and is valid **only** from `RoundOver`. `StartRound(requesterId)` keeps its host check for `Lobby` and `GameOver`.
* `RoundStarted`, `TurnStarted` and snapshots are emitted exactly as for a host start, and the existing turn timer is started for the first player.
* Additive contract field: `IntermissionDeadlineUtc` (nullable `DateTime`) on `PlayerGameStateDto` and `GameStateSnapshotDto`, following the existing `DischargeDeadlineUtc` pattern. The client countdown in `RoundIntermissionBanner` is derived from it (after the cinematic), the client-side `onStartNextRound` auto-call is removed, and the `waitingForHost`/`hostGone` fallbacks from `intermissionFallback.ts` are retired for `RoundOver`. They remain meaningful for `Lobby` and `GameOver`, where a human start is still required.

### Host re-assignment (shared helper, also used by [ADR 0011](0011-server-side-leaveroom-hub-method-and-seat-departure-semantics.md))

* One domain method chooses the successor: the first seat that is not `Eliminated` and not `Disconnected` (falling back to any non-eliminated seat), used by `RemovePlayer` and `EliminatePlayer`. Re-assignment on *disconnect* is deliberately **not** added: until the 30 s grace expires the seat is still the host; if the host drops in `Lobby`/`GameOver` the existing grace-expiry path re-assigns it.
* Broadcast stays the existing snapshot (`hostId` is already a snapshot field), so no new event is introduced.

### Why not A

The existing 30 s grace already ends in host re-assignment; A would add a second timer to shave part of that window, still depends on a client, and creates host flapping on reconnect. B removes the dependency instead of shortening it.

### Enforcement

* **Domain tests** (`GameEngine.Domain.Tests`): `AdvanceRound` rejected outside `RoundOver`; works with a disconnected or absent host; deals hands, increments `RoundNumber`, sets the first turn like `StartRound`; host successor skips `Disconnected`/`Eliminated` seats in `RemovePlayer` and `EliminatePlayer`.
* **Infrastructure tests** (`GameEngine.Infrastructure.Tests`, fake `ITurnDelay` so no real sleeping): intermission timer fires the next round; is cancelled/ignored on `GameOver`, on leave-induced room removal, and when the round number changed; two quick `RoundOver` entries do not double-start.
* **Integration tests** (`Integration.Tests/HeadlessGameLoopTests.cs`): a match where the host's connection is dropped during `RoundOver` still reaches `TurnActive` of the next round without any client `StartRound`; non-host clients receive `RoundStarted`; snapshot in `RoundOver` carries `intermissionDeadlineUtc`.
* **Contract fixtures:** `RoomStateSnapshot.json` / `GameStateSnapshot.json` regenerated by `SignalRContractFixtureTests` with `intermissionDeadlineUtc`; Vitest contract test parses them against the updated `RoomStateSnapshotSchema`/`PlayerGameStateSchema` ([ADR 0004](0004-runtime-model-validation-with-zod.md), [ADR 0007](0007-api-contract-pipeline-orval-and-zod.md)).
* **Frontend tests:** `RoundIntermissionBanner.test.tsx` asserts it never calls `startRound` automatically and renders the countdown from the snapshot deadline; `intermissionFallback` tests updated.
* **Single-writer:** the timer only enqueues into the room session; reviewed via `CqrsShapeTests` plus the integration test above. `Architecture.Tests` are not modified.

## Consequences

### Positive

* Rounds always advance, independent of host connectivity or tab throttling.
* Fewer client-side special cases (`waitingForHost` / `hostGone` in `RoundOver`).
* Host successor can no longer be an already-disconnected seat.

### Negative

* Players lose the (already automatic) ability to hold the table between rounds; any "pause" feature would need its own design.
* A fixed server intermission must cover the longest client cinematic; a too-short value would cut it off (to be tuned and covered by the constant being shared in docs/tests).
* A disconnected host in `Lobby`/`GameOver` still stalls until the 30 s grace expires; accepted as the lobby and rematch are explicit human actions.
