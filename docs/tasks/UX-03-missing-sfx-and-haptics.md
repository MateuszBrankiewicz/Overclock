# UX-03 — Brakujące dźwięki i haptyka

> ADR: [0014](../adr/0014-game-audio-engine-on-the-web-audio-api.md) (Accepted)
> Zakres: frontend · Bez nowych zależności, 0 plików audio
> Commit: `feat(frontend): add missing game sfx and turn haptics (ADR 0014)`

## Problem

Jest tylko 7 efektów (`shared/lib/audio/types.ts`). Bez dźwięku pozostają: zaznaczenie karty, początek
własnej tury, końcówka czasu, użycie exploita, przetrwanie testu, wygrana. Wzorzec `vibrate('turn')`
z `shared/lib/haptics.ts` nie jest nigdzie wywoływany.

## Kroki

1. Nowe efekty w `shared/lib/audio/effects.ts` + nazwy w `types.ts`:
   `cardSelect` (krótki tik, wyższy przy zaznaczeniu, niższy przy odznaczeniu), `yourTurn` (dwutonowy ping),
   `turnTick` (tik na każdą z ostatnich 5 s, rosnąca wysokość), `exploitActivate` (sweep),
   `survived` (opadający „uff”), `victory` (krótki arpeggio).
2. Podpięcie — wyłącznie przez `playSfx`, nie w komponentach:
   - `cardSelect`: w `toggleCardSelection` (`stores/slices/createHandSlice.ts`) lub w handlerze sesji,
   - `yourTurn` + `vibrate('turn')`: przy przejściu `activePlayerId` na lokalnego gracza
     (tam, gdzie store przetwarza snapshot pokoju),
   - `turnTick`: w `hooks/useCountdown.ts` przy zmianie `secondsLeft` w stanie `isCritical`,
     tylko dla własnej tury,
   - `exploitActivate`: zdarzenie aktywacji exploita w `recordGameEvent` (`hooks/useDebugTerminal.ts`),
   - `survived`: `CapacitorDischarged` z `overloaded === false`, po zakończeniu `discharge`,
   - `victory`: przejście do `GameOver`, gdy `winnerId === playerId`.
3. Dodaj wzorzec haptyczny `select: 10` i wywołuj go razem z `cardSelect`.
4. Testy: rozszerz `audioEngine.test.ts` (nowe efekty budują graf i nie rzucają),
   `recordGameEvent.test.ts` (właściwy efekt na zdarzenie), `haptics.test.ts`.
5. Sprawdź limit rozmiaru chunku audio z T-0014 (≤ 8 KB gzip).
6. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Każda akcja gracza i każda zmiana fazy ma sygnał dźwiękowy.
- [ ] `turnTick` nie gra podczas tury przeciwnika ani po wyciszeniu.
- [ ] Telefon wibruje na początku własnej tury.
