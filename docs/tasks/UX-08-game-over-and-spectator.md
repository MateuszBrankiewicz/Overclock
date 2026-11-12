# UX-08 — Finał meczu i tryb widza

> ADR: brak (prezentacja; statystyki meczu wymagałyby zmiany kontraktu — poza zakresem)
> Zakres: frontend · Bez nowych zależności
> Zależy od: UX-03 (dźwięk `victory`), UX-05 (kamera na zwycięzcę)
> Commit: `feat(frontend): match finale and spectator hud (UX-08)`

## Problem

`MatchSummary.tsx` to statyczna tabelka — wygrana nie ma żadnej celebracji. Wyeliminowany gracz
dostaje kamerę z góry, ale HUD nie mówi, że jest widzem, i nadal pokazuje nieaktywny pasek akcji.

## Kroki

1. **Finał**: wejście `MatchSummary` z opóźnieniem ~1,2 s — najpierw kamera na zwycięzcę (UX-05),
   jego rdzeń i wizjer świecą mocniej, lampa nad stołem zmienia kolor na bursztyn. Potem panel wjeżdża
   (`motion/react`), wiersze podium pojawiają się po kolei od ostatniego miejsca.
2. Wariant lokalny: nagłówek „WYGRAŁEŚ” / „PRZEGRAŁEŚ — miejsce #N” (i18n), dźwięk `victory` tylko dla zwycięzcy.
3. Awatar postaci przy każdym wierszu podium (kolor i kryptonim z `utils/characterCatalog.ts`).
4. **Widz**: gdy `isEliminated`, ukryj `ActionStrip` i `CardMarkLegend`, pokaż plakietkę
   „OBSERWUJESZ” oraz przełącznik kamery między żyjącymi operatorami (strzałki ← → i dwa przyciski);
   stan fokusa w `useGameStore` (`cameraFocus`), nie w komponencie.
5. Testy: `MatchSummary.test.tsx` (warianty nagłówka, kolejność), test HUD widza w `hud/hud.test.tsx`.
6. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [x] Koniec meczu ma wyraźny moment kulminacyjny przed pokazaniem tabeli.
- [x] Wyeliminowany gracz widzi, że obserwuje, i może wybierać, na kogo patrzy.
- [x] Przy `prefers-reduced-motion` panel pojawia się od razu.
