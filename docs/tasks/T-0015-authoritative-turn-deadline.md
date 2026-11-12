# T-0015 — Autorytatywny deadline tury w snapshotach

> ADR: [0015](../adr/0015-authoritative-turn-deadline-in-room-snapshots.md) (Accepted)
> Zakres: backend (GameEngine) + Contracts + frontend · Kontrakt: **zmiana addytywna** `ReceiveGameState`
> Commit: `feat(game-engine): broadcast authoritative turn deadline in snapshots (ADR 0015)`

## Cel

Klient wyświetla timer tury i ostrzeżenie „ostatnie 5 s” na podstawie prawdziwego timeoutu serwera
(`TurnTimerEngine.DefaultTurnDuration`, 15 s), a nie lokalnej estymaty `now + 15 s`.

## Kroki — backend

1. **Testy najpierw.**
   - `backend/tests/Integration.Tests/GameHubIntegrationTests.cs`: nowy test
     `Snapshot_carries_turn_deadline_while_turn_active`:
     po `StartRound` i po `PlayCards` każdy klient dostaje `ReceiveGameState` z `TurnDeadlineUtc != null`
     i wartością w przedziale `[now + 13 s, now + 16 s]`; w `Lobby` / `RoundOver` / `GameOver` → `null`.
   - Test domenowy w `backend/tests/GameEngine.Domain.Tests/Rooms/`: po rozpoczęciu tury
     `GameRoom.CurrentTurnDeadlineUtc` jest ustawione, po przejściu do `RoundOver` czyszczone.
2. **Domena.** W `GameRoom` dodaj `DateTime? CurrentTurnDeadlineUtc { get; private set; }` oraz metodę
   `MarkTurnDeadline(DateTime deadlineUtc)` (zwraca `Result`, błąd gdy stan ≠ `TurnActive`).
   Czyść wartość przy każdym wyjściu z `TurnActive` (RoundOver, VoltageTest, GameOver, Lobby, `ResetForMatch`).
3. **Pętla pokoju.** W miejscu, gdzie planowany jest timer tury (`TurnTimerEngine` / komendy
   `StartRound`, `PlayCards`, auto‑play po timeoutcie, `ActivateExploitCommand` — ten już liczy deadline)
   wewnątrz `session.EnqueueAsync(room => ...)` wywołaj `room.MarkTurnDeadline(now + duration)`.
   Czas bierz z `TimeProvider` / istniejącej abstrakcji zegara, nie `DateTime.UtcNow` wprost.
   Overclock (exploit) nadpisuje deadline tą samą metodą — jedno źródło.
4. **DTO.** W `Overclock.Modules.GameEngine.Contracts/Dtos.cs` dodaj `DateTime? TurnDeadlineUtc = null`
   do `PlayerGameStateDto` (obok `DischargeDeadlineUtc`) i, jeśli istnieje równoległy
   `GameStateSnapshotDto`, również tam.
5. **Projekcja.** `Application/Projections/GameStateProjector.cs`: `TurnDeadlineUtc: room.CurrentTurnDeadlineUtc`.
6. **Usuń `TurnStartedEvent`** z `Contracts/GameEvents.cs` (`grep -rn TurnStartedEvent backend` → 0).
7. **Fixture.** Uruchom `SignalRContractFixtureTests` — zaktualizuje `tests/contracts/signalr/GameStateSnapshot.json`
   (i inne snapshoty) o `turnDeadlineUtc`. Przejrzyj diff fixture.

## Kroki — frontend

8. **Zod.** `frontend/src/features/game/schemas/gameEvents.ts`: w schemacie snapshotu
   `turnDeadlineUtc: z.string().datetime({ offset: true }).nullable().optional()`.
   Test fixture (porównanie z `tests/contracts/signalr/*.json`) musi przejść.
9. **Store.** `stores/slices/createRoomSlice.ts` → `applyRoomSnapshot`:
   `turnDeadlineUtc = snapshot.turnDeadlineUtc ?? null` (gdy brak pola → `null`, bez estymaty).
   Deadline z `ExploitTriggered` dalej nadpisuje, ale kolejny snapshot jest źródłem prawdy.
10. **Sprzątanie.** Usuń `estimateTurnDeadlineUtc` i `TURN_DURATION_SECONDS` z `utils/cinematicTiming.ts`
    oraz ich testy; `grep -rn "estimateTurnDeadlineUtc\|TURN_DURATION_SECONDS" frontend/src` → 0.
11. **Testy Vitest.**
    - store: snapshot z `turnDeadlineUtc` ustawia dokładnie tę wartość; snapshot bez pola → `null`;
      reconnect w połowie tury pokazuje pozostały czas, nie 15 s,
    - `hud.test.tsx`: `TurnUrgencyCountdownView` liczy z deadline’u serwera.
12. `bash scripts/verify.sh --fast`, potem pełne `bash scripts/verify.sh` (Testcontainers).

## Kryteria akceptacji

- [ ] Timer tury widoczny w każdej turze, zgodny z timeoutem serwera (±1 s).
- [ ] Po odświeżeniu strony w połowie tury timer pokazuje pozostały czas.
- [ ] `TurnStartedEvent` i lokalna estymata usunięte.
- [ ] Test integracyjny + fixture + test Zod + test store zielone.
