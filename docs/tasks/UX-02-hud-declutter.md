# UX-02 — Odchudzenie i uporządkowanie HUD

> ADR: brak (prezentacja, [ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md))
> Zakres: frontend · Bez nowych zależności
> Commit: `refactor(frontend): declutter in-game hud (UX-02)`

## Problem

- Tura jest pokazywana w czterech miejscach: `ActiveTurnLabel`, hologram w `TableCenterpiece3D`,
  `YourTurnBanner`, wizjer przeciwnika.
- `EventFeed` (`fixed left-2 top-14`) wypada w tym samym rogu co `PhaseTimers` i `ActiveTurnLabel`
  (lewa kolumna pod górnym paskiem w `BunkerArenaCanvas.tsx`).
- Większość tekstu HUD ma 9–11 px.
- Przyciski 3D TRACE/TRANSMIT na stole (`PovHandAndControls3D.tsx`) nie mają etykiet i dublują `ActionStrip`.

## Kroki

1. **Najpierw zrzuty ekranu** 360×740, 768×1024, 1440×900 (skill `run`) — potwierdź nakładanie się
   elementów i dołącz obserwacje do opisu commita.
2. Usuń `ActiveTurnLabel` z `hud/TurnStatusHud.tsx`; tura przeciwnika zostaje w hologramie i na wizjerze.
   Zaktualizuj `hud/hud.test.tsx`.
3. Jedna lewa kolumna HUD: przenieś `EventFeed` do wnętrza kolumny w `BunkerArenaCanvas`
   (pod `PhaseTimers`), usuń `position: fixed`. Na ekranach < 640 px pokazuj 3 ostatnie wpisy zamiast 5.
4. Minimalny rozmiar tekstu HUD: 11 px na mobile, 12 px od `sm`. Usuń `text-[9px]` i `text-[10px]`
   z `CardMarkLegend`, `TimerBar`, `ActionStrip`, `EventFeed`, `CameraPresetBar`.
5. Przyciski 3D: dodaj etykiety (tekstura canvas jak w `pcbCardTexture.ts`, teksty z i18n)
   albo — jeśli po zrzutach nadal są nieczytelne — odbierz im `onClick` i zostaw jako dekorację.
   Wybór opisz w commicie.
6. Górny pasek na mobile: ikony audio/głos/zasady/wyjście schowane pod jednym przyciskiem „⋯”
   (popover), kod pokoju i status połączenia zostają widoczne.
7. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Na 360 px żaden element HUD nie nachodzi na inny ani na rękę gracza.
- [ ] Informacja „czyja tura” występuje najwyżej w dwóch miejscach.
- [ ] Brak tekstu poniżej 11 px w HUD.
