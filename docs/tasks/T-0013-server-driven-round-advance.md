# T-0013 — Przejście do kolejnej rundy sterowane przez serwer

> ADR: [0013](../adr/0013-server-driven-round-advance-and-host-re-assignment-on-disconnect.md) (Accepted)
> Zakres: backend + frontend + kontrakt · Zależy od: [T-0011](T-0011-leave-room.md) (helper hosta),
> [BUG-02](BUG-02-next-round-modal-after-whole-check.md)
> Commit: `feat(game-engine): server-driven intermission and round advance (ADR 0013)`

## Cel

Po `RoundOver` serwer sam odlicza przerwę i startuje kolejną rundę. Klient nie wywołuje już
`StartRound` automatycznie (dziś robi to host po 3 s — gra staje, gdy host się rozłączy).

## Kroki — backend

1. **Testy najpierw.**
   - Domena: `GameRoom.AdvanceRound(IRandomSource)` działa tylko z `RoundOver`
     (inne stany → `Result.Invalid`/`Conflict`), rozdaje karty, ustawia nowy protokół i numer rundy.
   - Infrastructure (`backend/tests/GameEngine.Infrastructure.Tests`): timer `Intermission`
     z fałszywym `ITurnDelay` — po upływie kolejkuje advance; anulowanie działa; przeterminowany
     timer z poprzedniej rundy (inny numer rundy) jest ignorowany.
   - Integracja (`backend/tests/Integration.Tests/HeadlessGameLoopTests.cs`): pełna runda → `RoundOver`
     → po `IntermissionDuration` wszyscy dostają `RoundStarted` **bez** wywołania `StartRound`;
     host rozłączony w przerwie → runda i tak startuje, host przechodzi na kolejnego gracza.
2. **Timer**: `TimerKind.Intermission` w `TurnTimerEngine`; `StartIntermission(roomCode, roundNumber, duration)`
   i `CancelIntermission(roomCode)` na tym samym `ITurnDelay` co timer tury.
3. **Czas przerwy** `IntermissionDuration`: wylicz z wymagań klienta (BUG-02):
   `traceRevealDurationMs(3) + dischargeCinematicDurationMs(true) + 3000 ms odliczania`.
   ADR zakłada 8 s — zweryfikuj z faktycznymi stałymi z `frontend/src/features/game/utils/cinematicTiming.ts`.
   Jeśli 8 s nie wystarcza, **zatrzymaj się i zgłoś** (zmiana wartości z ADR wymaga decyzji człowieka / nowego ADR).
   Wartość jako opcja konfiguracji (`GameEngineOptions`), nie magiczna liczba.
4. **Start przerwy**: w miejscu przejścia do `RoundOver` (`CallTraceCommand` → `voltageCoordinator.DispatchResolutionAsync`,
   ścieżka VoltageTest / Ground Wire, timeout decyzji) — w pętli pokoju ustaw
   `room.IntermissionDeadlineUtc = now + IntermissionDuration` i uruchom timer.
   Przy `GameOver` przerwy **nie** ma.
5. **Wygaśnięcie**: callback timera robi `session.EnqueueAsync(room => ...)` i sprawdza, czy
   `room.State == RoundOver && room.RoundNumber == expectedRound`; tylko wtedy `AdvanceRound`,
   potem `RoundStarted` + `BroadcastSnapshotsAsync` + start timera tury (T-0015 deadline).
6. **`StartRound` z huba** zostaje dla startu z lobby. W `RoundOver` host może przyspieszyć — wtedy
   `CancelIntermission` + ten sam `AdvanceRound` (albo odmowa, zgodnie z ADR — sprawdź treść ADR).
7. **Sukcesja hosta przy rozłączeniu**: użyj `HostSuccession.NextHost` z T-0011 w obsłudze
   rozłączenia (grace period) — jeden helper dla Leave i Disconnect.
8. **DTO**: `DateTime? IntermissionDeadlineUtc` w `PlayerGameStateDto` (i `GameStateSnapshotDto`),
   projektor w `GameStateProjector.cs`; `null` poza `RoundOver`.
9. **Fixture**: `SignalRContractFixtureTests` → aktualizacja `tests/contracts/signalr/*Snapshot.json`.

## Kroki — frontend

10. **Zod**: `intermissionDeadlineUtc: z.string().datetime({ offset: true }).nullable().optional()`.
11. **Store**: `applyRoomSnapshot` zapisuje `intermissionDeadlineUtc`.
12. **`RoundIntermissionBanner.tsx`**: odliczanie z `useCountdown(intermissionDeadlineUtc)` zamiast
    lokalnego 3 s; **usuń** automatyczne `onStartNextRound` hosta. Przycisk „Start teraz” dla hosta
    tylko jeśli ADR na to pozwala.
    Uwaga BUG-02: modal pokazuje się dopiero po cinematicu, więc liczba sekund przy pojawieniu się
    to resztka przerwy (~3 s) — to zamierzone.
13. **Sprzątanie**: wycofaj stany `waitingForHost` / `hostGone` w `RoundOver`
    (`utils/intermissionFallback.ts` + testy + i18n), `grep` → 0 użyć.
14. **Vitest**: `RoundIntermissionBanner.test.tsx` — licznik z deadline’u, brak wywołania `onStartNextRound`;
    test store dla `intermissionDeadlineUtc`.
15. `bash scripts/verify.sh --fast` + pełne `bash scripts/verify.sh`.

## Kryteria akceptacji

- [ ] Kolejna runda startuje sama, także gdy host jest offline.
- [ ] Przerwa wystarcza na całe odkrycie + wyładowanie + odliczanie (zgodnie z BUG-02).
- [ ] Stary timer nie startuje rundy po ręcznym/innym przejściu (guard numeru rundy).
- [ ] Klient nie woła `StartRound` w `RoundOver`; testy domena/infra/integracja/fixture/Vitest zielone.
