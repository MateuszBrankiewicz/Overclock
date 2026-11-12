# BUG-02 — Modal „następna runda” pojawia się przed końcem etapu sprawdzenia

> Typ: **bug** · Zakres: frontend · Zależy od: [BUG-01](BUG-01-remove-card-reveal-modal.md)
> Commit: `fix(frontend): show next-round countdown only after the whole trace sequence`

## Objaw

Modal `RoundIntermissionBanner` („KONIEC RUNDY … START KOLEJNEGO CYKLU ZA 3”) potrafi się pojawić,
zanim gracze zobaczą cały etap sprawdzenia: odkrycie kart → (decyzja Ground Wire) → wyładowanie na
robocie → ewentualna animacja śmierci. Odliczanie startuje za wcześnie, a host od razu wywołuje
`StartRound`, więc kolejna runda potrafi uciąć animację.

## Oczekiwana sekwencja (jedyna poprawna kolejność)

```
TraceCalled
  └─ 1. REVEAL      karty odwracają się na stole (traceRevealDurationMs(n))
  └─ 2. DECISION    tylko gdy przegrany ma Ground Wire: VoltageTest + VoltageControls + timer decyzji
  └─ 3. DISCHARGE   wyładowanie na robocie przegranego (DISCHARGE_CINEMATIC_MS)
  └─ 4. DEATH       tylko przy overloaded: animacja śmierci (OperatorRig3D) do końca
  └─ 5. INTERMISSION modal z dużym odliczaniem 3‑2‑1 → nowa runda
     (albo MatchSummary, gdy GameOver)
```

Modal (krok 5) **nigdy** nie jest widoczny razem z krokami 1–4. Odliczanie zaczyna się dopiero
w momencie pokazania modala.

## Przyczyny do weryfikacji

1. `OperatingTable.tsx` warunkuje modal tylko `!traceReveal && !dischargeCinematic`. Między
   `finishTraceReveal()` a nadejściem `CapacitorDischarged` (ścieżka Ground Wire, opóźnienie sieci,
   kolejka akcji) jest okno, w którym `roomState === 'RoundOver'`, a nic nie trwa → modal wskakuje.
2. `DISCHARGE_CINEMATIC_MS = 3600` (`utils/cinematicTiming.ts`) może być krótsze niż animacja śmierci
   w `arena3d/OperatorRig3D.tsx` (sprawdź faktyczny czas kinematyki śmierci).
3. Snapshot `RoundOver` może przyjść, zanim `TraceCalled` zostanie przetworzony przez
   `useActionQueue` — wtedy `traceReveal` jeszcze nie istnieje.
4. Podczas REVEAL `VoltageControls` są liczone z prawdziwego `roomState` (`VoltageTest`), więc przyciski
   decyzji mogą wyskoczyć nad odwracanymi kartami.

## Kroki

1. **Reprodukcja.** Dwie karty przeglądarki, lokalny backend. Przypadki:
   (a) blef wykryty, przegrany bez Ground Wire, (b) przegrany z Ground Wire,
   (c) overload → eliminacja → GameOver, (d) throttling sieci „Slow 3G” w DevTools.
   Zapisz, w którym momencie pojawia się modal.
2. **Model fazy (czysta funkcja).** Utwórz `frontend/src/features/game/utils/outcomePhase.ts`:
   ```ts
   export type OutcomePhase = 'reveal' | 'decision' | 'discharge' | 'intermission' | 'summary' | null;
   export function resolveOutcomePhase(input: {
     roomState: RoomState | null;
     hasTraceReveal: boolean;
     hasQueuedDischarge: boolean;
     hasDischargeCinematic: boolean;
     awaitingDischarge: boolean; // trace rozstrzygnięty, wyładowanie jeszcze nie przyszło
   }): OutcomePhase
   ```
   Kolejność priorytetów: `reveal` > `decision` (VoltageTest) > `discharge` (cinematic **lub** queued
   **lub** awaiting) > `summary` (GameOver) > `intermission` (RoundOver) > `null`.
3. **Stan „czekam na wyładowanie”.** W `stores/types.ts` + `stores/slices/createTurnSlice.ts` /
   `createRoomSlice.ts` dodaj `awaitingDischargeForSequence: number | null`:
   - ustawiane w `applyTraceResolution` (sequenceNumber trace’a),
   - czyszczone w `dischargeUpdate` (gdy cinematic startuje), w `applyRoundStarted`, w `leaveRoom`,
     w `resetGame` oraz gdy snapshot ma `state` = `TurnActive` / `Lobby` (bezpiecznik),
   - **bezpiecznik czasowy:** jeśli wyładowanie nie przyjdzie w `AWAIT_DISCHARGE_TIMEOUT_MS`
     (np. 4000 ms; dodaj do `cinematicTiming.ts`), `OperatingTable` czyści flagę, żeby UI nie utknęło.
4. **Czas animacji śmierci.** Zmierz realny czas w `OperatorRig3D.tsx`. Dodaj do
   `cinematicTiming.ts` `DEATH_CINEMATIC_MS` i `dischargeCinematicDurationMs(overloaded)` =
   `overloaded ? max(DISCHARGE_CINEMATIC_MS, DEATH_CINEMATIC_MS) : DISCHARGE_CINEMATIC_MS`.
   Użyj tej funkcji w efekcie auto‑czyszczenia `dischargeCinematic` w `OperatingTable.tsx`
   oraz w `OperatorRig3D` (jedno źródło prawdy).
5. **Snapshot przed TraceCalled.** W `applyRoomSnapshot` (`createRoomSlice.ts`): jeśli snapshot ma
   `lastTraceResolution` z `sequenceNumber` > `lastRevealedTraceSequence` i nie trwa `traceReveal`,
   uruchom odkrycie z tej rozdzielczości (ta sama logika co `applyTraceResolution`; wydziel helper
   `startTraceReveal(state, resolution)`), żeby kolejność nie zależała od tego, co przyjdzie pierwsze.
6. **OperatingTable.** Zastąp warunki `traceReveal` / `dischargeCinematic` / `roomState` jednym
   `const phase = resolveOutcomePhase(...)`:
   - `phase === 'reveal'` → `roomState` dla canvasu = `'BluffCheck'`, **brak** `VoltageControls`
     (przekaż do `BunkerArenaCanvas` `isVoltageTestActive={phase === 'decision'}`),
   - `phase === 'decision'` → `VoltageControls` jak dziś,
   - `phase === 'discharge'` → nic na środku,
   - `phase === 'summary'` → `MatchSummary`,
   - `phase === 'intermission'` → `RoundIntermissionBanner` (`isDischargeCinematicActive={false}`),
   - `RoundIntroBanner` tylko gdy `phase === null`.
   Połącz z `resolveCenterOverlay` z BUG-01 (jedna funkcja albo `centerOverlay` korzysta z `outcomePhase`).
7. **Odliczanie startuje przy montażu.** `RoundIntermissionBanner` ma `key={roundNumber}` — upewnij się,
   że licznik 3 s startuje w chwili zamontowania (nie wcześniej) i że host wywołuje `onStartNextRound`
   dopiero po 0. Po T-0013 licznik będzie liczony z `intermissionDeadlineUtc` — zostaw komentarz
   z odnośnikiem do ADR 0013.
8. **Testy (Vitest):**
   - `outcomePhase.test.ts`: tabela przypadków — reveal przykrywa VoltageTest; RoundOver + awaiting →
     `discharge`; RoundOver + queued → `discharge`; RoundOver bez niczego → `intermission`;
     GameOver po cinematicu → `summary`,
   - `traceCinematic.test.ts`: `awaitingDischargeForSequence` ustawiane i czyszczone; snapshot
     z nowszym `lastTraceResolution` startuje reveal,
   - `cinematicTiming.test.ts`: `dischargeCinematicDurationMs(true) >= DEATH_CINEMATIC_MS`,
   - `RoundIntermissionBanner.test.tsx`: zawiera `intermission-countdown`.
9. **Weryfikacja ręczna** wszystkich czterech przypadków z kroku 1 — modal dopiero po animacji.
10. `bash scripts/verify.sh --fast` → zielone.

## Kryteria akceptacji

- [ ] W żadnym przypadku (a–d) modal nie pojawia się w trakcie odkrycia, decyzji, wyładowania ani śmierci.
- [ ] Odliczanie 3‑2‑1 zaczyna się w chwili pokazania modala.
- [ ] Przy GameOver po animacji pojawia się `MatchSummary`, nie modal rundy.
- [ ] UI nigdy nie utyka (bezpiecznik czasowy).
- [ ] Testy jednostkowe dla `resolveOutcomePhase` pokrywają wszystkie gałęzie.

## Uwaga na przyszłość

Po wdrożeniu [T-0013](T-0013-server-driven-round-advance.md) serwer odlicza przerwę
(`IntermissionDuration`). Ta wartość musi być ≥ `traceRevealDurationMs(3) + dischargeCinematicDurationMs(true) + 3000`.
T-0013 zawiera krok sprawdzający tę zależność.
