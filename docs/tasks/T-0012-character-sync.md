# T-0012 — Synchronizacja wyboru postaci (`PlayerSeat.CharacterId`)

> ADR: [0012](../adr/0012-synchronised-character-selection-via-playerseat-characterid.md) (Accepted)
> Zakres: backend + frontend + kontrakt
> Commit: `feat(game-engine): synchronise character selection via seat CharacterId (ADR 0012)`

## Cel

Każdy gracz widzi u innych tę samą postać (ghost / volt / proxy / null), którą wybrali w lobby.
Dziś wybór jest tylko lokalny (`characterByPlayerId`, hash w `resolveSeatCharacter`). Postać jest
też potrzebna do głosów robotów ([T-0016](T-0016-robot-voices.md)).

## Kroki — backend

1. **Testy domenowe najpierw** (`backend/tests/GameEngine.Domain.Tests/Characters/`, `Rooms/`):
   - `CharacterCatalog.IsValid("ghost") == true`, `IsValid("bogus") == false`,
   - dołączenie z `PreferredCharacterId` wolnym → przypisany; zajętym lub `null` → pierwszy wolny,
   - `SelectCharacter`: poza lobby → `Room.NotInLobby`; nieznany → `Room.InvalidCharacter` (Invalid);
     zajęty przez innego → `Room.CharacterTaken` (Conflict); ten sam co obecny → success bez zmian,
   - więcej graczy niż postaci (jeśli limit pokoju > 4) — zachowanie wg ADR (sprawdź i opisz test).
2. **Katalog**: `GameEngine.Domain/Characters/CharacterCatalog.cs` —
   `public static readonly IReadOnlyList<string> All = ["ghost", "volt", "proxy", "null"]`, `IsValid(string)`.
3. **Seat**: `PlayerSeat.CharacterId` (string, nie null), ustawiany w `AddPlayer`.
4. **Requests**: `PreferredCharacterId` (opcjonalne) w `CreateRoomRequest` i `JoinRoomRequest`
   (`HubRequests.cs`) → przekazywane do komend.
5. **Nowa metoda huba**: `SelectCharacter(SelectCharacterRequest(RoomCode, CharacterId))`
   → `SelectCharacterCommand` (`Application/Rooms/Commands/`) → `session.EnqueueAsync(room => room.SelectCharacter(playerId, id))`
   → `BroadcastSnapshotsAsync`.
6. **DTO + projekcja**: `PlayerSeatDto.CharacterId`.
7. **Fixture**: `SignalRContractFixtureTests` → `RoomStateSnapshot.json`, `GameStateSnapshot.json`,
   `RoomJoinResult.json`, nowe `SelectCharacterContract.json`, `CharacterCatalog.json`.
8. **Integracja** (`GameHubIntegrationTests.cs`): A wybiera `volt` → B widzi `volt` w snapshocie;
   B próbuje `volt` → Conflict; po starcie gry → `NotInLobby`.

## Kroki — frontend

9. **Zod**: `PlayerSeatSchema` + `characterId: z.string().min(1)`; schemat `SelectCharacterContract`.
10. **Test parytetu katalogu**: Vitest porównuje `tests/contracts/signalr/CharacterCatalog.json`
    z listą postaci w `features/game/...` (konfiguracja rigów 3D) — muszą być identyczne.
11. **Store**: usuń `characterByPlayerId`, `setPlayerCharacter` i gałąź hash w `resolveSeatCharacter`
    (postać = `seat.characterId`). `setSelectedCharacter(id)` w lobby wywołuje `invoke('SelectCharacter', ...)`;
    `selectedCharacter` z localStorage wysyłany jako `preferredCharacterId` przy create/join.
12. **UI wyboru**: rigi zajęte przez innych są wyłączone (`disabled`, opis „zajęty przez X”);
    błąd Conflict → toast i powrót do poprzedniego wyboru.
13. **Vitest**: snapshot → postacie per seat; invoke z poprawnym payloadem; zajęte rigi wyłączone.
14. `bash scripts/verify.sh --fast` + pełne `bash scripts/verify.sh`.

## Kryteria akceptacji

- [ ] Wszyscy gracze widzą identyczne postacie przy stole.
- [ ] Dwóch graczy nie może mieć tej samej postaci.
- [ ] Brak lokalnej mapy postaci i hashowania na froncie.
- [ ] Fixture + parytet katalogu + testy domenowe/integracyjne/Vitest zielone.
