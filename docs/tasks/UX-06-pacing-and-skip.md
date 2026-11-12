# UX-06 — Tempo sekwencji między rundami

> ADR: [0013](../adr/0013-server-driven-round-advance-and-host-re-assignment-on-disconnect.md) (Accepted) — bez zmiany czasów serwera
> Zakres: frontend · Bez nowych zależności
> Commit: `feat(frontend): tighten between-round presentation pacing (UX-06)`

## Problem

Po każdym TRACE gracz ogląda ponad 10 s bez interakcji: odsłonięcie (~3 s), wyładowanie (3,6–3,8 s),
odliczanie przerwy, intro rundy (`ROUND_INTRO_MS` = 2,2 s). Pominąć da się tylko wyładowanie.

## Kroki

1. Zmierz realne czasy (log w trybie dev) dla 1 i 3 odsłanianych kart i zapisz je w opisie commita.
2. Intro rundy: zamiast osobnego modala pokazuj numer rundy i protokół w ostatniej sekundzie
   odliczania w `RoundIntermissionBanner.tsx`; `RoundIntroBanner` zostaje tylko dla rundy 1.
   Skróć `ROUND_INTRO_MS` do ~1400 ms.
3. `REVEAL_VERDICT_HOLD_MS`: 2100 → ~1600 ms (po UX-01 werdykt czyta się szybciej).
4. Pominięcie tapnięciem: tap / `Space` podczas odsłonięcia i wyładowania kończy lokalną kinematykę
   (`finishTraceReveal`, `clearDischargeCinematic`). Dotyczy tylko prezentacji u danego gracza —
   stan gry nadal wyznacza serwer.
5. `RoundIntermissionBanner`: usuń lokalny zapasowy licznik 3 s; gdy brak `intermissionDeadlineUtc`,
   pokaż stan „oczekiwanie” bez liczby.
6. Zaktualizuj `cinematicTiming.test.ts`, `RoundIntermissionBanner.test.tsx`, `RoundIntroBanner.test.tsx`.
7. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Od werdyktu do pierwszego ruchu w nowej rundzie mija wyraźnie mniej czasu niż przed zmianą (pomiar w commicie).
- [ ] Każdą kinematykę można pominąć jednym tapnięciem.
- [ ] Pominięcie u jednego gracza nie wpływa na pozostałych.
