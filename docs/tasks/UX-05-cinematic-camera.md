# UX-05 — Kamera podążająca za akcją

> ADR: brak (prezentacja, [ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md))
> Zakres: frontend · Bez nowych zależności
> Commit: `feat(frontend): action-aware arena camera (UX-05)`

## Problem

W `CameraController.tsx` fazy `BluffCheck` i `VoltageTest` ustawiają kamerę w jednej stałej pozycji.
Kamera nie pokazuje oskarżonego, rażonego ani zwycięzcy.

## Kroki

1. Rozszerz propsy `CameraController` o `subjectPosition: [x, y, z] | null` — miejsce operatora,
   którego dotyczy bieżąca faza. Wyliczaj je w `BunkerArenaCanvas.tsx` z istniejących
   `seatLayouts` (jak `shockTargetInfo` / `revealLoserPos`):
   - odsłonięcie kart: najpierw środek stołu, po werdykcie przegrany,
   - test napięcia / wyładowanie: testowany operator,
   - `GameOver`: zwycięzca.
2. Gdy `subjectPosition` jest ustawione, punkt patrzenia interpoluje 60/40 między stołem a operatorem,
   a kamera przysuwa się o ~0,4 w jego stronę. Gdy podmiotem jest lokalny gracz — obecne zachowanie.
3. Delikatne przechylenie w stronę aktywnego gracza w `TurnActive` (maks. ~0,15 yaw), wyłączane,
   gdy użytkownik sam przeciągnie kamerę (`useCameraDrag`) — ręczne sterowanie ma pierwszeństwo.
4. Krótki wstrząs kamery (~120 ms, mała amplituda) w chwili uderzenia błyskawicy w przeciwnika.
5. `prefers-reduced-motion`: bez wstrząsów i bez automatycznego przechylenia; zostaje tylko zmiana celu.
6. Wydziel wyliczanie celu do czystej funkcji `resolveCameraTarget(...)` i przetestuj ją (Vitest).
7. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] W każdej fazie widać operatora, którego ona dotyczy, bez ręcznego obracania kamery.
- [ ] Ręczne przeciągnięcie zawsze wygrywa z automatyką.
- [ ] Sekwencja śmierci lokalnego gracza działa jak dotąd.
