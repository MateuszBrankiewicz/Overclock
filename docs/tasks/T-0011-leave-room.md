# T-0011 — Metoda `LeaveRoom` i semantyka odejścia z miejsca

> ADR: [0011](../adr/0011-server-side-leaveroom-hub-method-and-seat-departure-semantics.md) (Accepted)
> Zakres: backend (Host + GameEngine) + frontend · Kontrakt: nowa metoda huba (bez nowego eventu do klienta)
> Commit: `feat(game-engine): add LeaveRoom hub method and seat departure (ADR 0011)`

## Cel

Gracz klikający „Wyjdź” faktycznie opuszcza pokój po stronie serwera: w lobby zwalnia miejsce,
w trakcie gry przegrywa walkowerem (forfeit), host przechodzi na następnego gracza, pusty pokój
jest sprzątany. Dziś frontend tylko czyści własny stan, a serwer czeka na grace period rozłączenia.

## Kroki — domena

1. **Testy domenowe najpierw** (`backend/tests/GameEngine.Domain.Tests/Rooms/GameRoomLeaveTests.cs`):
   - Lobby: gracz znika z `Players`; gdy wychodzi host → host = pierwszy pozostały gracz,
   - Lobby: ostatni gracz → `room.IsEmpty == true`,
   - `Dealing` / `TurnActive` / `VoltageTest` / `RoundOver`: gracz `Eliminated` + `HasLeft = true`,
     `ConnectionId == null`; gdy była jego tura → tura przechodzi dalej; gdy zostaje 1 aktywny → `GameOver`,
   - `GameOver`: gracz usuwany,
   - `ResetForMatch` usuwa seaty z `HasLeft`,
   - nieznany `PlayerId` → `Result.Success()` (idempotentnie),
   - drugi `Leave` tego samego gracza → success, bez zmian.
2. **`PlayerSeat`**: dodaj `bool HasLeft { get; private set; }` i `MarkLeft()` (ustawia też `ConnectionId = null`).
   `Reconnect(...)` dla seatu z `HasLeft` zwraca `Result.Forbidden("Seat.Left")`.
3. **Helper hosta** (wspólny z T-0013): `GameEngine.Domain/Rooms/HostSuccession.cs`,
   `static PlayerId? NextHost(IReadOnlyList<PlayerSeat> seats, PlayerId currentHost)` — pierwszy
   seat ≠ current, nie `Eliminated`, nie `Disconnected`, nie `HasLeft`; fallback: pierwszy nie `HasLeft`.
   Osobne testy jednostkowe.
4. **`GameRoom.Leave(PlayerId)`** → `Result`:
   - `Lobby`: `RemovePlayer` + ewentualna sukcesja hosta,
   - stany w grze: `EliminatePlayer(id, reason: Forfeit)` (użyj istniejącej ścieżki eliminacji,
     żeby powstał `PlayerEliminated`), `MarkLeft()`, sukcesja hosta, sprawdzenie końca meczu,
   - `GameOver`: usunięcie,
   - zwraca też informację, czy pokój jest pusty (np. `Result<LeaveOutcome>` z `RoomEmpty`, `HostChangedTo`).

## Kroki — aplikacja i host

5. **Komenda**: `Overclock.Modules.GameEngine.Application/Rooms/Commands/LeaveRoomCommand.cs`
   `record LeaveRoomCommand(string RoomCode, PlayerId PlayerId) : ICommand<Result>` + handler:
   - brak pokoju w rejestrze → `Result.Success()`,
   - `await session.EnqueueAsync(room => room.Leave(playerId))`,
   - pusty pokój → `turnTimer.Cancel(roomCode)` (wszystkie rodzaje timerów) + `registry.Remove(roomCode)`
     + usunięcie metadanych z Redis (`overclock:game:room:{code}`),
   - zmiana hosta → aktualizacja metadanych Redis (z TTL!),
   - na końcu `notifier.PlayerStatusChanged(...)` i `BroadcastSnapshotsAsync(room)`.
6. **Hub** (`backend/src/Host/Overclock.Host/Hubs/HubRequests.cs`, `GameHub.cs`):
   - `record LeaveRoomRequest(string RoomCode)`,
   - `public async Task<HubResponse> LeaveRoom(LeaveRoomRequest request)`:
     - brak śledzonego połączenia / seatu → sukces (idempotentnie),
     - śledzone połączenie z innym pokojem → `Forbidden("Connection.RoomMismatch")`,
     - `sender.Send(new LeaveRoomCommand(...))`,
     - po sukcesie: `Groups.RemoveFromGroupAsync`, `connectionTracker.Remove(Context.ConnectionId)`,
       `IDisconnectGraceManager.CancelGracePeriod(roomCode, playerId)`.
   - Żadnej logiki biznesowej w hubie — tylko transport + mediator.
7. **Kontrakt**: `LeaveRoomContractDto` w Contracts + fixture `tests/contracts/signalr/LeaveRoomContract.json`
   generowany przez `SignalRContractFixtureTests`.

## Kroki — testy integracyjne

8. `backend/tests/Integration.Tests/GameHubIntegrationTests.cs`:
   - Lobby: B wychodzi → A dostaje snapshot bez B; host wychodzi → B zostaje hostem,
   - w grze: B wychodzi → A dostaje `PlayerEliminated`/`PlayerStatusChanged` i snapshot, gra trwa / kończy się,
   - ostatni gracz wychodzi → pokój znika z rejestru i Redis,
   - `HasActiveGracePeriod(room, B) == false` po `LeaveRoom`,
   - `LeaveRoom` równolegle z `PlayCards` (Task.WhenAll) → spójny stan, brak wyjątku,
   - ponowny `JoinRoom`/reconnect tym samym tokenem po odejściu → odmowa.

## Kroki — frontend

9. **Zod**: `LeaveRoomContractSchema` w `schemas/gameEvents.ts` + test zgodności z fixture.
10. **`leaveRoom`** (store / `useDebugTerminal.ts`): najpierw `connection.invoke('LeaveRoom', { roomCode })`
    z timeoutem (np. 2000 ms, `Promise.race`), błąd tylko logowany; **zawsze** potem czyszczenie stanu,
    URL (`useRoomUrlSync`) i tokenu sesji.
11. **Vitest**: invoke wywołany z właściwym kodem; przy błędzie/timeoutcie stan i tak wyczyszczony.
12. `bash scripts/verify.sh --fast` + pełne `bash scripts/verify.sh`.

## Kryteria akceptacji

- [ ] Wyjście w lobby zwalnia miejsce natychmiast; host przechodzi dalej.
- [ ] Wyjście w trakcie gry = eliminacja, gra toczy się dalej bez czekania na grace period.
- [ ] Pusty pokój usunięty z pamięci i Redis.
- [ ] Brak nowego eventu do klienta; testy domenowe, integracyjne, fixture, Vitest zielone.
