# 12. Synchronised Character Selection via PlayerSeat CharacterId

Date: 2026-11-12

## Status

Accepted

Amends [0010](0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md).

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

[ADR 0010](0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md) introduced four selectable operator rigs (`ghost`, `volt`, `proxy`, `null`), but the choice never leaves the browser:

* `createRoomSlice.ts` stores `selectedCharacterId` (persisted in `localStorage` as `overclock_character`) and `characterByPlayerId`, where `setRoom` writes **only the local player's** entry.
* `PlayerSeat` (`GameEngine.Domain/Rooms/PlayerSeat.cs`) and `PlayerSeatDto` (`GameEngine.Contracts/Dtos.cs`) carry `PlayerId, Nickname, Status, IsReady, HandCount, RiskLevel, Exploit` — no character. `PlayerSeatSchema` in `features/game/schemas/gameEvents.ts` mirrors that.
* For every other seat `resolveSeatCharacter` (`utils/characterCatalog.ts`) falls back to a hash of `seatPlayerId` and `seatIndex` over "all characters except *my* selection". The result depends on the viewing client's own pick and on seat order, so **two clients see different rigs for the same player**, and two opponents can map to the same rig (or to the same rig as the local player's neighbour).
* `setPlayerCharacter` exists in the store but nothing feeds it from the server.

Adding a field to `PlayerSeat`/`PlayerSeatDto` and a hub command changes the SignalR contract, which requires an ADR ([AGENTS.md](../../AGENTS.md) §1.2) and fixture updates ([ADR 0007](0007-api-contract-pipeline-orval-and-zod.md)).

## Decision Drivers

* **Server as single source of truth** for anything every client must agree on (ADR 0003); the visual identity of a seat is shared state.
* **Single-writer loop:** seat mutation only inside the room's `EnqueueAsync` (ADR 0003 §2).
* **Runtime validation:** all incoming payloads pass Zod `safeParse` ([ADR 0004](0004-runtime-model-validation-with-zod.md)); the server validates all incoming ids.
* **Module boundaries:** presentation data (colours, bios, rig geometry) stays in the frontend; the backend must only know opaque, validated ids.
* **Additive, backward-compatible contract change.**

## Considered Options

1. **Keep client-side hash fallback, make it deterministic across clients** (hash of playerId only). Rejected: removes the per-viewer discrepancy but still ignores player choice and still allows duplicates.
2. **Strongly typed enum `CharacterId` in `SharedKernel`.** Rejected: `SharedKernel` is for cross-module primitives (Result, base entity, domain events); only `GameEngine` needs characters, and a closed enum forces a contract change on every new rig.
3. **Server-owned catalog of opaque string ids in `GameEngine.Domain` (like `ExploitCatalog`), `CharacterId` on `PlayerSeat`, hub command `SelectCharacter` (Chosen).**

## Decision Outcome

Chosen Option: **Option 3**.

### Where the catalog lives

* `GameEngine.Domain/Characters/CharacterCatalog.cs` exposes `static IReadOnlyList<string> All = ["ghost", "volt", "proxy", "null"]` and `IsValid(string)`, mirroring the existing `ExploitCatalog.All` pattern. The domain validates against it; the wire format is a plain string (`PlayerSeatDto.CharacterId`), so `Contracts` carries no enum.
* The frontend `CHARACTER_CATALOG` keeps all presentation data. Parity between the two lists is enforced by a fixture (see Enforcement), not by a shared project.
* If another module (e.g. `Economy` unlocking cosmetic rigs) later needs the list, it goes through `GameEngine.Contracts`, never through a direct module reference.

### Contract changes (all additive)

* `PlayerSeat` gains `CharacterId` (string, never null); `PlayerSeatDto` gains `string CharacterId`. Seats are projected into `PlayerGameStateDto`, `GameStateSnapshotDto` and `PlayerJoined`, so every snapshot, join and reconnect carries the character.
* `CreateRoomRequest` and `JoinRoomRequest` gain optional `string? PreferredCharacterId = null`. On create/join the server assigns the preferred id if free and valid, otherwise the **first free id in catalog order**, so a seat always has a character.
* New hub method `Task<HubResponse> SelectCharacter(SelectCharacterRequest request)` with `SelectCharacterRequest(string RoomCode, string CharacterId)`, dispatching `SelectCharacterCommand(RoomCode, PlayerId, CharacterId)` (caller identity from `ValidateCaller`), executed in the room loop, followed by `BroadcastSnapshotsAsync` — identical flow to `SetReadyCommand`. No new server-to-client event.
* Rules in `GameRoom.SelectCharacter`: state must be `Lobby` (`Room.NotInLobby` otherwise, same code as `SetReady`); id must be in the catalog (`Room.InvalidCharacter`, an `Invalid` result); id must not be held by **another** seat (`Room.CharacterTaken`, a `Conflict` result); selecting the character you already hold is an idempotent success.
* Uniqueness is per room, first come first served, and survives `GameOver -> Lobby` rematch. Because the catalog must hold at least `Deck.MaxPlayers` (4) entries, uniqueness can never make a join impossible; this invariant is tested.

### Frontend

* `PlayerSeatSchema` gains `characterId: z.string().min(1)`. It is deliberately **not** a `z.enum`, so a newer server adding a rig cannot make an older client reject a whole snapshot; `getCharacterById` already falls back to the first rig for unknown ids.
* `characterByPlayerId`, `setPlayerCharacter` and the hash branch of `resolveSeatCharacter` are removed; rigs are resolved from `players[].characterId`. `selectedCharacterId` remains the local *preference* sent as `PreferredCharacterId`; `setSelectedCharacter` while in a lobby also invokes `SelectCharacter`, and the UI shows taken rigs as disabled and reverts on `Room.CharacterTaken`.
* No REST/Orval impact; `frontend/src/shared/api/generated/**` is not touched.

### Enforcement

* **Contract fixtures:** `SignalRContractFixtureTests` regenerates `RoomStateSnapshot.json`, `GameStateSnapshot.json`, `RoomJoinResult.json` (their `seats[]` now include `characterId`) and adds `SelectCharacterContract.json` and `CharacterCatalog.json` (the server id list). A change fails the test until the fixture is re-committed.
* **Vitest contract tests** (`features/game/schemas/gameEvents.test.ts`): parse every updated fixture with `RoomStateSnapshotSchema`/`PlayerGameStateSchema`; a parity test asserts `CHARACTER_CATALOG.map(c => c.id)` equals `CharacterCatalog.json` (fails on drift in either direction); a test asserts a snapshot with an unknown `characterId` still parses.
* **Domain tests** (`GameEngine.Domain.Tests`): default assignment is first free; preferred id honoured / falls back when taken; `SelectCharacter` rejects non-lobby, unknown id, taken id; idempotent re-select; `CharacterCatalog.All.Count >= Deck.MaxPlayers`; characters kept across rematch.
* **Integration tests** (`Integration.Tests/GameHubIntegrationTests.cs`): two clients, A selects `volt`, B receives a snapshot where A's seat is `volt`; B selecting `volt` gets `Room.CharacterTaken`; reconnect snapshot carries the character; selecting during a match fails.
* **Single-writer:** the handler touches the room only inside `EnqueueAsync`; `CqrsShapeTests` covers the handler shape. `Architecture.Tests` are not modified.

## Consequences

### Positive

* Every client renders the same rig for the same player; duplicates are impossible.
* Reconnecting clients and spectators of the lobby get the choice for free via snapshots.
* New rigs are a frontend asset change plus one catalog line, guarded by the parity fixture.

### Negative

* The id list exists in two places (backend catalog, frontend catalog), kept consistent only by the parity test.
* Contract change touches three snapshot fixtures and requires coordinated backend + frontend release (mitigated by additive fields and the lenient `z.string()`).
* With four rigs and four seats, the last joiner may be forced into a rig they did not prefer.
