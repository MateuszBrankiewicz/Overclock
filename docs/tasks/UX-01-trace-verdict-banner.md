# UX-01 — Czytelny werdykt po TRACE

> ADR: brak (zmiana prezentacyjna w ramach [ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md))
> Zakres: frontend · Bez nowych zależności
> Commit: `feat(frontend): trace verdict banner during card reveal (UX-01)`

## Problem

Po sprawdzeniu blefu wynik widać tylko po kolorze obwódek kart, błyskawicy i wpisie 10 px w feedzie.
Gracz z dalszego miejsca (i na telefonie) nie wie, kto wygrał spór.

## Kroki

1. Nowy komponent `features/game/components/TraceVerdictBanner.tsx` (HTML overlay, `pointer-events-none`,
   `role="status"`), wzorowany na `RoundIntroBanner.tsx` (`motion/react`).
   Propsy: `bluffDetected`, `accuserNickname`, `accusedNickname`, `loserNickname`, `isLocalLoser`,
   `declaredProtocol`, `startedAtMs`, `cardCount`.
2. Pojawia się dopiero po odwróceniu ostatniej karty:
   `startedAtMs + (cardCount + 1) * REVEAL_CARD_STAGGER_MS` (stałe z `utils/cinematicTiming.ts`;
   dodaj tam czystą funkcję `verdictVisibleAtMs(cardCount, startedAtMs)` + test).
3. Treść (i18n PL/EN w `shared/i18n/useI18n.ts`, sekcja `verdict`):
   - nagłówek: „BLEF WYKRYTY” (czerwony) / „CZYSTA TRANSMISJA” (szmaragd),
   - podtytuł: „{przegrany} idzie na test napięcia”, a dla lokalnego gracza „TY idziesz na test napięcia”.
4. Montaż w `OperatingTable.tsx` przy `traceReveal` (dane z `traceReveal.resolution` i `seatsAtReveal`).
   Stan zostaje w store — komponent tylko wyświetla.
5. `prefers-reduced-motion`: bez animacji wejścia, baner widoczny od razu po odsłonięciu kart.
6. Testy Vitest: oba warianty tekstu, wariant „TY”, baner niewidoczny przed `verdictVisibleAtMs`.
7. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Werdykt i przegrany są czytelne z każdego miejsca i na ekranie 360 px.
- [ ] Baner nie zdradza wyniku przed odwróceniem ostatniej karty.
- [ ] Teksty w PL i EN, żadnych zaszytych napisów.
